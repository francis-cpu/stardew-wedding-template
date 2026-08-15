import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { resolveRsvpConfig } from '../rsvp-config.js'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('ships RSVP disabled and hidden by default', async () => {
  const defaults = JSON.parse(await read('config/rsvp.default.json'))
  const config = JSON.parse(await read('config/rsvp.json'))
  const wrangler = JSON.parse(await read('wrangler.jsonc'))
  const html = await read('index.html')

  assert.deepEqual(defaults, { enabled: false, apiUrl: '/api/rsvp' })
  assert.equal(config.enabled, false)
  assert.equal(config.apiUrl, defaults.apiUrl)
  assert.equal('d1_databases' in wrangler, false)
  assert.match(html, /<section class="rsvp story-section" id="rsvp" data-rsvp-ui hidden>/)
  assert.match(html, /data-rsvp-shortcut hidden/)
})

test('loads RSVP client only after the feature is enabled', async () => {
  const app = await read('app.js')

  assert.match(app, /import rsvpConfig from '.\/rsvp-config\.js'/)
  assert.match(app, /if \(rsvpConfig\.enabled\) \{/)
  assert.match(app, /import\('\.\/rsvp-client\.js'\)/)
})

test('keeps RSVP disabled unless the build override is explicitly true', () => {
  const base = { enabled: false, apiUrl: '/api/rsvp' }

  assert.equal(resolveRsvpConfig(base, undefined).enabled, false)
  assert.equal(resolveRsvpConfig(base, 'false').enabled, false)
  assert.equal(resolveRsvpConfig(base, 'true').enabled, true)
})
