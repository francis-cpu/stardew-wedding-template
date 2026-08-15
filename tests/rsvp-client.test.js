import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../rsvp-client.js', import.meta.url), 'utf8')

test('uses the configured API and preserves edits locally', () => {
  assert.doesNotMatch(source, /import rsvpConfig/)
  assert.match(source, /export function initializeRsvp\(rsvpConfig\)/)
  assert.match(source, /fetch\(rsvpConfig\.apiUrl/)
  assert.match(source, /stardew-wedding-rsvp/)
})

test('keeps accommodation validation in the optional client', () => {
  assert.match(source, /退房时间必须晚于入住时间/)
  assert.match(source, /needsAccommodation/)
  assert.match(source, /checkInAt/)
  assert.match(source, /checkOutAt/)
})
