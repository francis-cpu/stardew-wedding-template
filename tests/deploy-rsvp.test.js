import assert from 'node:assert/strict'
import test from 'node:test'
import { createDeploymentPlan } from '../scripts/lib/deploy-rsvp.js'

test('uses the generic disabled deployment without local RSVP state', () => {
  assert.deepEqual(createDeploymentPlan({ hasLocalWrangler: false, hasEnableMarker: false }), {
    buildArgs: ['run', 'build'],
    deployArgs: ['pages', 'deploy', 'dist'],
  })
})

test('uses the local binding and RSVP build mode when enabled locally', () => {
  assert.deepEqual(createDeploymentPlan({ hasLocalWrangler: true, hasEnableMarker: true }), {
    buildArgs: ['run', 'build', '--', '--mode', 'rsvp'],
    deployArgs: ['pages', 'deploy', 'dist', '--config', 'wrangler.rsvp.jsonc'],
  })
})

test('keeps the local binding when deploying RSVP as disabled', () => {
  assert.deepEqual(createDeploymentPlan({ hasLocalWrangler: true, hasEnableMarker: false }), {
    buildArgs: ['run', 'build', '--', '--mode', 'rsvp'],
    deployArgs: ['pages', 'deploy', 'dist', '--config', 'wrangler.rsvp.jsonc'],
  })
})

test('rejects an enable marker without its local Wrangler binding', () => {
  assert.throws(
    () => createDeploymentPlan({ hasLocalWrangler: false, hasEnableMarker: true }),
    /本地 RSVP 配置不完整/,
  )
})
