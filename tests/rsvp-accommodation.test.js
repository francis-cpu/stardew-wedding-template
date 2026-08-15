import assert from 'node:assert/strict'
import test from 'node:test'
import { webcrypto } from 'node:crypto'
import { onRequestPost } from '../functions/api/rsvp.js'

if (!globalThis.crypto) globalThis.crypto = webcrypto

function request(body) {
  return new Request('https://example.test/api/rsvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function fakeEnv() {
  const calls = []
  return {
    calls,
    DB: {
      prepare(sql) {
        return {
          bind(...values) {
            calls.push({ sql, values })
            return {
              async run() { return {} },
              async first() { return undefined },
            }
          },
        }
      },
    },
  }
}

test('stores an RSVP without accommodation dates when accommodation is not needed', async () => {
  const env = fakeEnv()
  const response = await onRequestPost({
    request: request({ guestName: '阿星', partySize: 2, needsAccommodation: false }),
    env,
  })

  assert.equal(response.status, 201)
  const insert = env.calls.find((call) => call.sql.includes('INSERT INTO rsvps'))
  assert.ok(insert)
  assert.deepEqual(insert.values.slice(4, 7), [0, null, null])
})

test('rejects an accommodation range whose checkout is not after checkin', async () => {
  const response = await onRequestPost({
    request: request({
      guestName: '阿星',
      partySize: 1,
      needsAccommodation: true,
      checkInAt: '2026-09-25T18:00',
      checkOutAt: '2026-09-25T12:00',
    }),
    env: fakeEnv(),
  })

  assert.equal(response.status, 400)
  assert.equal((await response.json()).error, '退房时间必须晚于入住时间。')
})
