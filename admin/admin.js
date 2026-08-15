import rsvpConfig from '../rsvp-config.js'

if (!rsvpConfig.enabled) {
  document.querySelector('#rsvp-disabled').hidden = false
  document.querySelector('#admin-app').hidden = true
} else {
  import('./admin-enabled.js')
}
