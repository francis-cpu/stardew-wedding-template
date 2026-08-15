import assert from 'node:assert/strict'
import test from 'node:test'
import { configureWranglerProject } from '../scripts/lib/cloudflare-config.js'

test('updates the Pages project name while preserving an existing DB binding', () => {
  const binding = { binding: 'DB', database_name: 'existing-rsvp', database_id: 'db-id' }
  const result = configureWranglerProject({ name: 'template', d1_databases: [binding] }, 'wedding-demo')

  assert.equal(result.name, 'wedding-demo')
  assert.deepEqual(result.d1_databases, [binding])
})

test('adds a discovered D1 database without discarding other config', () => {
  const result = configureWranglerProject(
    { name: 'template', compatibility_date: '2026-08-01' },
    'wedding-demo',
    { name: 'wedding-demo-rsvp', uuid: 'db-id' },
  )

  assert.deepEqual(result, {
    name: 'wedding-demo',
    compatibility_date: '2026-08-01',
    d1_databases: [{ binding: 'DB', database_name: 'wedding-demo-rsvp', database_id: 'db-id' }],
  })
})
