import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import * as deployment from '../scripts/lib/deploy-rsvp.js'

const { createDeploymentPlan, deployRsvp } = deployment

test('uses the generic disabled deployment without local RSVP state', () => {
  assert.deepEqual(createDeploymentPlan({ hasLocalWrangler: false, hasEnableMarker: false }), {
    buildArgs: ['run', 'build'],
    deployArgs: ['pages', 'deploy', 'dist'],
    useLocalWrangler: false,
  })
})

test('uses the local binding and RSVP build mode when enabled locally', () => {
  assert.deepEqual(createDeploymentPlan({ hasLocalWrangler: true, hasEnableMarker: true }), {
    buildArgs: ['run', 'build', '--', '--mode', 'rsvp'],
    deployArgs: ['pages', 'deploy', 'dist'],
    useLocalWrangler: true,
  })
})

test('keeps the local binding when deploying RSVP as disabled', () => {
  assert.deepEqual(createDeploymentPlan({ hasLocalWrangler: true, hasEnableMarker: false }), {
    buildArgs: ['run', 'build', '--', '--mode', 'rsvp'],
    deployArgs: ['pages', 'deploy', 'dist'],
    useLocalWrangler: true,
  })
})

test('wraps a local Pages deployment instead of passing a custom config path', async () => {
  const calls = []

  await deployRsvp({
    hasLocalWrangler: true,
    hasEnableMarker: true,
    run: async (command, args) => calls.push([command, args]),
    withLocalWrangler: async (callback) => {
      calls.push(['local-config', 'start'])
      await callback()
      calls.push(['local-config', 'end'])
    },
  })

  assert.deepEqual(calls.at(-3), ['local-config', 'start'])
  assert.deepEqual(calls.at(-2), ['wrangler', ['pages', 'deploy', 'dist']])
  assert.deepEqual(calls.at(-1), ['local-config', 'end'])
})

test('restores the tracked Wrangler config when Pages deployment fails', async () => {
  assert.equal(typeof deployment.withLocalWranglerConfig, 'function')
  const directory = await mkdtemp(join(tmpdir(), 'stardew-wrangler-test-'))
  const defaultConfigUrl = new URL(`file://${join(directory, 'wrangler.jsonc')}`)
  const localConfigUrl = new URL(`file://${join(directory, 'wrangler.rsvp.jsonc')}`)
  await writeFile(defaultConfigUrl, 'template-default')
  await writeFile(localConfigUrl, 'private-rsvp-config')

  try {
    await assert.rejects(
      deployment.withLocalWranglerConfig({ defaultConfigUrl, localConfigUrl }, async () => {
        assert.equal(await readFile(defaultConfigUrl, 'utf8'), 'private-rsvp-config')
        throw new Error('deploy failed')
      }),
      /deploy failed/,
    )
    assert.equal(await readFile(defaultConfigUrl, 'utf8'), 'template-default')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('rejects an enable marker without its local Wrangler binding', () => {
  assert.throws(
    () => createDeploymentPlan({ hasLocalWrangler: false, hasEnableMarker: true }),
    /本地 RSVP 配置不完整/,
  )
})
