import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('ships RSVP disabled and hidden by default', async () => {
  const defaults = JSON.parse(await read('config/rsvp.default.json'))
  const config = JSON.parse(await read('config/rsvp.json'))
  const html = await read('index.html')

  assert.deepEqual(defaults, { enabled: false, apiUrl: '/api/rsvp' })
  assert.equal(typeof config.enabled, 'boolean')
  assert.equal(config.apiUrl, defaults.apiUrl)
  assert.match(html, /<section class="rsvp story-section" id="rsvp" data-rsvp-ui hidden>/)
  assert.match(html, /data-rsvp-shortcut hidden/)
})

test('loads RSVP client only after the feature is enabled', async () => {
  const app = await read('app.js')

  assert.match(app, /import rsvpConfig from '.\/config\/rsvp\.json' with \{ type: 'json' \}/)
  assert.match(app, /if \(rsvpConfig\.enabled\) \{/)
  assert.match(app, /import\('\.\/rsvp-client\.js'\)/)
})
