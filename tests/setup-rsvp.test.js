import assert from 'node:assert/strict'
import test from 'node:test'
import { configureRsvp } from '../scripts/lib/setup-rsvp.js'

function harness({ failAt, projectAlreadyExists = false } = {}) {
  const calls = []
  let config = { enabled: false, apiUrl: '/api/rsvp' }
  return {
    calls,
    get config() { return config },
    deps: {
      async run(command, args, options = {}) {
        calls.push([command, args, options])
        if (projectAlreadyExists && args.join(' ') === 'pages project create wedding-demo --production-branch main') {
          throw new Error('A project with this name already exists. Choose a different project name. [code: 8000002]')
        }
        if (args.includes(failAt)) throw new Error(`failed at ${failAt}`)
        if (args.includes('list')) return JSON.stringify([])
        return ''
      },
      async readRsvpConfig() { return structuredClone(config) },
      async writeRsvpConfig(value) { config = structuredClone(value) },
      async ensureLogin() { calls.push(['ensureLogin']) },
      async ensureD1Binding() { calls.push(['ensureD1Binding']) },
      async uploadSecrets() { calls.push(['uploadSecrets']) },
      async verifyDeployment() {
        calls.push(['verifyDeployment'])
        if (failAt === 'verify') throw new Error('failed at verify')
      },
      randomSecret() { return 's'.repeat(64) },
      log(message) { calls.push(['log', message]) },
    },
  }
}

test('configures cloud resources before enabling RSVP', async () => {
  const state = harness()
  await configureRsvp({ projectName: 'wedding-demo', adminPassword: 'a-strong-password' }, state.deps)

  assert.equal(state.config.enabled, true)
  const deployIndex = state.calls.findIndex((call) => call[1]?.includes('deploy'))
  const verifyIndex = state.calls.findIndex((call) => call[0] === 'verifyDeployment')
  assert.ok(deployIndex > -1)
  assert.ok(verifyIndex > deployIndex)
  assert.deepEqual(state.calls.at(-1), ['log', 'RSVP 已开启：https://wedding-demo.pages.dev/'])
})

test('continues setup when project creation reports an existing Pages project', async () => {
  const state = harness({ projectAlreadyExists: true })

  await configureRsvp({ projectName: 'wedding-demo', adminPassword: 'a-strong-password' }, state.deps)

  assert.equal(state.config.enabled, true)
  assert.ok(state.calls.some((call) => call[0] === 'ensureD1Binding'))
  assert.deepEqual(state.calls.at(-1), ['log', 'RSVP 已开启：https://wedding-demo.pages.dev/'])
})

test('restores the disabled config when deployment fails', async () => {
  const state = harness({ failAt: 'deploy' })

  await assert.rejects(
    configureRsvp({ projectName: 'wedding-demo', adminPassword: 'a-strong-password' }, state.deps),
    /failed at deploy/,
  )
  assert.equal(state.config.enabled, false)
})

test('redeploys the disabled build when verification fails', async () => {
  const state = harness({ failAt: 'verify' })

  await assert.rejects(
    configureRsvp({ projectName: 'wedding-demo', adminPassword: 'a-strong-password' }, state.deps),
    /failed at verify/,
  )
  assert.equal(state.config.enabled, false)
  assert.equal(state.calls.filter((call) => call[1]?.includes('deploy')).length, 2)
})
