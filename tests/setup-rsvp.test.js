import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { configureRsvp } from '../scripts/lib/setup-rsvp.js'

const setupScript = await readFile(new URL('../scripts/setup-rsvp.js', import.meta.url), 'utf8')

function harness({ failAt, projectAlreadyExists = false } = {}) {
  const calls = []
  let localState = null
  return {
    calls,
    get localState() { return localState },
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
      async readLocalRsvpState() { return localState },
      async enableLocalRsvp() {
        calls.push(['enableLocalRsvp'])
        localState = 'VITE_RSVP_ENABLED=true\n'
      },
      async restoreLocalRsvp(value) {
        calls.push(['restoreLocalRsvp', value])
        localState = value
      },
      async ensureLogin() { calls.push(['ensureLogin']) },
      async ensureD1Binding() { calls.push(['ensureD1Binding']) },
      async uploadSecrets() { calls.push(['uploadSecrets']) },
      async deploy() {
        calls.push(['deploy'])
        if (failAt === 'deploy') throw new Error('failed at deploy')
      },
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

  assert.equal(state.localState, 'VITE_RSVP_ENABLED=true\n')
  const enableIndex = state.calls.findIndex((call) => call[0] === 'enableLocalRsvp')
  const deployIndex = state.calls.findIndex((call) => call[0] === 'deploy')
  const verifyIndex = state.calls.findIndex((call) => call[0] === 'verifyDeployment')
  assert.ok(enableIndex > -1)
  assert.ok(deployIndex > enableIndex)
  assert.ok(deployIndex > -1)
  assert.ok(verifyIndex > deployIndex)
  assert.deepEqual(state.calls.at(-1), ['log', 'RSVP 已开启：https://wedding-demo.pages.dev/'])
})

test('continues setup when project creation reports an existing Pages project', async () => {
  const state = harness({ projectAlreadyExists: true })

  await configureRsvp({ projectName: 'wedding-demo', adminPassword: 'a-strong-password' }, state.deps)

  assert.equal(state.localState, 'VITE_RSVP_ENABLED=true\n')
  assert.ok(state.calls.some((call) => call[0] === 'ensureD1Binding'))
  assert.deepEqual(state.calls.at(-1), ['log', 'RSVP 已开启：https://wedding-demo.pages.dev/'])
})

test('restores the disabled config when deployment fails', async () => {
  const state = harness({ failAt: 'deploy' })

  await assert.rejects(
    configureRsvp({ projectName: 'wedding-demo', adminPassword: 'a-strong-password' }, state.deps),
    /failed at deploy/,
  )
  assert.equal(state.localState, null)
})

test('redeploys the disabled build when verification fails', async () => {
  const state = harness({ failAt: 'verify' })

  await assert.rejects(
    configureRsvp({ projectName: 'wedding-demo', adminPassword: 'a-strong-password' }, state.deps),
    /failed at verify/,
  )
  assert.equal(state.localState, null)
  assert.equal(state.calls.filter((call) => call[0] === 'deploy').length, 2)
})

test('uses the ignored local Wrangler config for remote migrations', async () => {
  const state = harness()

  await configureRsvp({ projectName: 'wedding-demo', adminPassword: 'a-strong-password' }, state.deps)

  assert.ok(state.calls.some((call) => (
    call[0] === 'wrangler'
    && call[1]?.join(' ') === 'd1 migrations apply DB --remote --config wrangler.rsvp.jsonc'
  )))
})

test('the interactive setup script does not edit the tracked RSVP config', () => {
  assert.doesNotMatch(setupScript, /config\/rsvp\.json/)
  assert.match(setupScript, /\.env\.rsvp\.local/)
  assert.match(setupScript, /wrangler\.rsvp\.jsonc/)
})

test('accepts a six-character administrator password', async () => {
  const state = harness()

  await configureRsvp({ projectName: 'wedding-demo', adminPassword: '123456' }, state.deps)

  assert.equal(state.localState, 'VITE_RSVP_ENABLED=true\n')
})

test('rejects a five-character administrator password before Cloudflare access', async () => {
  const state = harness()

  await assert.rejects(
    configureRsvp({ projectName: 'wedding-demo', adminPassword: '12345' }, state.deps),
    /管理员密码至少需要 6 个字符/,
  )
  assert.equal(state.calls.some((call) => call[0] === 'ensureLogin'), false)
})

test('shows the six-character minimum in the interactive prompt', () => {
  assert.match(setupScript, /管理员密码（至少 6 个字符）/)
})
