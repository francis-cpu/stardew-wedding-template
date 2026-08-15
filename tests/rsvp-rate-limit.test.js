import assert from 'node:assert/strict'
import test from 'node:test'
import { webcrypto } from 'node:crypto'
import { onRequestPost } from '../functions/api/rsvp.js'

if (!globalThis.crypto) globalThis.crypto = webcrypto

function request(body) {
  return new Request('https://example.test/api/rsvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' },
    body: JSON.stringify(body),
  })
}

function fakeEnv(submissionRecord) {
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
              async first() {
                return sql.includes('FROM rsvp_submissions') ? submissionRecord : undefined
              },
            }
          },
        }
      },
    },
  }
}

function submissionCounterCall(env) {
  return env.calls.find((call) => call.sql.includes('INTO rsvp_submissions'))
}

const validBody = { guestName: '阿星', partySize: 2, needsAccommodation: false }

test('rejects a submission while the IP is blocked', async () => {
  const env = fakeEnv({ submissions: 10, first_submitted_at: Date.now(), blocked_until: Date.now() + 60_000 })
  const response = await onRequestPost({ request: request(validBody), env })

  assert.equal(response.status, 429)
  assert.equal((await response.json()).error, '提交过于频繁，请稍后再试。')
  assert.ok(!env.calls.some((call) => call.sql.includes('INSERT INTO rsvps')))
})

test('counts a first submission without blocking', async () => {
  const env = fakeEnv(undefined)
  const response = await onRequestPost({ request: request(validBody), env })

  assert.equal(response.status, 201)
  const counter = submissionCounterCall(env)
  assert.ok(counter)
  assert.equal(counter.values[0], '203.0.113.7')
  assert.equal(counter.values[1], 1)
  assert.equal(counter.values[3], 0)
})

test('blocks the IP after the tenth submission in the window', async () => {
  const now = Date.now()
  const env = fakeEnv({ submissions: 9, first_submitted_at: now - 60_000, blocked_until: 0 })
  const response = await onRequestPost({ request: request(validBody), env })

  assert.equal(response.status, 201)
  const counter = submissionCounterCall(env)
  assert.equal(counter.values[1], 10)
  assert.equal(counter.values[2], now - 60_000)
  assert.ok(counter.values[3] > now)
})

test('restarts the counter once the window has elapsed', async () => {
  const now = Date.now()
  const env = fakeEnv({ submissions: 9, first_submitted_at: now - 20 * 60 * 1000, blocked_until: 0 })
  const response = await onRequestPost({ request: request(validBody), env })

  assert.equal(response.status, 201)
  const counter = submissionCounterCall(env)
  assert.equal(counter.values[1], 1)
  assert.equal(counter.values[2] >= now - 1000, true)
  assert.equal(counter.values[3], 0)
})
