import assert from 'node:assert/strict'
import test from 'node:test'
import { enterRsvpSuccessState, exitRsvpSuccessState } from '../rsvp-client.js'

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

test('restores the form and releases the locked RSVP height for editing', () => {
  const section = { style: { minHeight: '1032px' }, classList: classList() }
  section.classList.add('is-complete')
  const form = { hidden: true }
  const success = { hidden: false }

  exitRsvpSuccessState({ section, form, success })

  assert.equal(form.hidden, false)
  assert.equal(success.hidden, true)
  assert.equal(section.classList.contains('is-complete'), false)
  assert.equal(section.style.minHeight, '')
})
