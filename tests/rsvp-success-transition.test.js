import assert from 'node:assert/strict'
import test from 'node:test'
import { enterRsvpSuccessState } from '../rsvp-client.js'

function classList() {
  const values = new Set()
  return {
    add: (value) => values.add(value),
    remove: (value) => values.delete(value),
    contains: (value) => values.has(value),
  }
}

test('locks the RSVP height before hiding the submitted form', () => {
  const form = { hidden: false }
  const section = {
    style: {},
    classList: classList(),
    getBoundingClientRect: () => ({ height: form.hidden ? 525 : 1032 }),
  }
  const success = {
    hidden: true,
    classList: classList(),
    focusOptions: undefined,
    focus(options) { this.focusOptions = options },
  }

  enterRsvpSuccessState({ section, form, success })

  assert.equal(section.style.minHeight, '1032px')
  assert.equal(section.classList.contains('is-complete'), true)
  assert.equal(form.hidden, true)
  assert.equal(success.hidden, false)
  assert.equal(success.classList.contains('is-visible'), true)
  assert.deepEqual(success.focusOptions, { preventScroll: true })
})
