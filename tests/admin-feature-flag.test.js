import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../admin/index.html', import.meta.url), 'utf8')
const script = await readFile(new URL('../admin/admin.js', import.meta.url), 'utf8')

test('shows setup guidance and skips admin API while RSVP is disabled', () => {
  assert.match(html, /id="rsvp-disabled"/)
  assert.match(html, /RSVP 默认关闭/)
  assert.match(script, /import rsvpConfig from '\.\.\/rsvp-config\.js'/)
  assert.match(script, /if \(!rsvpConfig\.enabled\)/)
  assert.match(script, /document\.querySelector\('#rsvp-disabled'\)\.hidden = false/)
  assert.match(script, /else \{\s*import\('\.\/admin-enabled\.js'\)/)
})
