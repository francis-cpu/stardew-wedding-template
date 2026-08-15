import assert from 'node:assert/strict'
import test from 'node:test'
import { onRequestPost as submitRsvp } from '../functions/api/rsvp.js'
import { onRequestGet as rsvpStatus } from '../functions/api/rsvp-status.js'
import { onRequestPost as login } from '../functions/api/admin/login.js'

test('returns a configuration error when DB is missing', async () => {
  const response = await submitRsvp({
    request: new Request('https://example.test/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestName: '测试宾客', partySize: 1, needsAccommodation: false }),
    }),
    env: {},
  })

  assert.equal(response.status, 503)
  assert.equal((await response.json()).error, 'RSVP 尚未完成配置，请联系邀请函所有者。')
})

test('returns a configuration error when admin secrets are missing', async () => {
  const response = await login({
    request: new Request('https://example.test/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'example' }),
    }),
    env: {},
  })

  assert.equal(response.status, 503)
  assert.equal((await response.json()).error, '管理后台尚未完成配置。')
})

test('reports whether all RSVP bindings and secrets are ready', async () => {
  const disabled = await rsvpStatus({ env: {} })
  assert.deepEqual(await disabled.json(), { enabled: false })

  const enabled = await rsvpStatus({
    env: {
      DB: { prepare() {} },
      ADMIN_PASSWORD: 'configured',
      SESSION_SECRET: 'configured',
    },
  })
  assert.deepEqual(await enabled.json(), { enabled: true })
})
