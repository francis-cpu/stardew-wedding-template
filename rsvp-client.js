export function initializeRsvp(rsvpConfig) {
const rsvpForm = document.querySelector('#rsvp-form')
const rsvpSuccess = document.querySelector('#rsvp-success')
const rsvpSuccessTitle = document.querySelector('#rsvp-success-title')
const rsvpSuccessSummary = document.querySelector('#rsvp-success-summary')
const rsvpError = document.querySelector('#rsvp-error')
const rsvpSubmit = rsvpForm.querySelector('[type="submit"]')
const accommodationField = document.querySelector('#accommodation-field')
const accommodationDates = document.querySelector('#accommodation-dates')
const messageField = rsvpForm.elements.message
const messageCount = document.querySelector('#message-count')
const rsvpStorageKey = 'stardew-wedding-rsvp'
let savedRsvp

try {
  savedRsvp = JSON.parse(window.localStorage.getItem(rsvpStorageKey))
} catch {
  savedRsvp = undefined
}

function updateAccommodationFields() {
  const needsAccommodation = rsvpForm.elements.needsAccommodation.value === 'yes'
  accommodationDates.hidden = !needsAccommodation
  rsvpForm.elements.checkInAt.required = needsAccommodation
  rsvpForm.elements.checkOutAt.required = needsAccommodation
  if (!needsAccommodation) {
    rsvpForm.elements.checkInAt.value = ''
    rsvpForm.elements.checkOutAt.value = ''
  }
}

function fillRsvpForm(rsvp) {
  if (!rsvp) return
  rsvpForm.elements.guestName.value = rsvp.guestName || ''
  rsvpForm.elements.partySize.value = String(rsvp.partySize || 1)
  const accommodation = rsvpForm.querySelector(`[name="needsAccommodation"][value="${rsvp.needsAccommodation ? 'yes' : 'no'}"]`)
  if (accommodation) accommodation.checked = true
  rsvpForm.elements.checkInAt.value = rsvp.checkInAt || ''
  rsvpForm.elements.checkOutAt.value = rsvp.checkOutAt || ''
  rsvpForm.elements.phone.value = rsvp.phone || ''
  rsvpForm.elements.message.value = rsvp.message || ''
  messageCount.value = String(rsvpForm.elements.message.value.length)
  updateAccommodationFields()
}

function formatAccommodationDateTime(value) {
  return value ? value.replace('T', ' ') : '待确认'
}

function showRsvpSuccess(rsvp) {
  rsvpForm.hidden = true
  rsvpSuccess.hidden = false
  rsvpSuccessTitle.textContent = `${rsvp.guestName}，已收到你的答复`
  const accommodation = rsvp.needsAccommodation
    ? ` · 住宿：${formatAccommodationDateTime(rsvp.checkInAt)} 至 ${formatAccommodationDateTime(rsvp.checkOutAt)}`
    : ' · 无需住宿'
  rsvpSuccessSummary.textContent = `已为你预留 ${rsvp.partySize} 个席位${accommodation}`
}

function showRsvpError(message) {
  rsvpError.textContent = message
  rsvpError.hidden = false
}

function collectRsvp() {
  const formData = new FormData(rsvpForm)
  const guestName = String(formData.get('guestName') || '').trim()
  const needsAccommodation = String(formData.get('needsAccommodation') || '')
  const checkInAt = String(formData.get('checkInAt') || '')
  const checkOutAt = String(formData.get('checkOutAt') || '')
  const phone = String(formData.get('phone') || '').trim()
  const message = String(formData.get('message') || '').trim()

  rsvpForm.elements.guestName.removeAttribute('aria-invalid')
  accommodationField.removeAttribute('aria-invalid')
  rsvpForm.elements.checkInAt.removeAttribute('aria-invalid')
  rsvpForm.elements.checkOutAt.removeAttribute('aria-invalid')
  if (!guestName) {
    rsvpForm.elements.guestName.setAttribute('aria-invalid', 'true')
    rsvpForm.elements.guestName.focus()
    throw new Error('请填写宾客姓名。')
  }
  if (!needsAccommodation) {
    accommodationField.setAttribute('aria-invalid', 'true')
    rsvpForm.querySelector('[name="needsAccommodation"]').focus()
    throw new Error('请选择是否需要住宿。')
  }
  if (needsAccommodation === 'yes' && (!checkInAt || !checkOutAt)) {
    const field = checkInAt ? rsvpForm.elements.checkOutAt : rsvpForm.elements.checkInAt
    field.setAttribute('aria-invalid', 'true')
    field.focus()
    throw new Error('请填写完整的住宿时间。')
  }
  if (needsAccommodation === 'yes' && checkOutAt <= checkInAt) {
    rsvpForm.elements.checkOutAt.setAttribute('aria-invalid', 'true')
    rsvpForm.elements.checkOutAt.focus()
    throw new Error('退房时间必须晚于入住时间。')
  }

  return {
    id: savedRsvp?.id,
    editToken: savedRsvp?.editToken,
    guestName,
    partySize: Number(formData.get('partySize')),
    needsAccommodation: needsAccommodation === 'yes',
    checkInAt: needsAccommodation === 'yes' ? checkInAt : null,
    checkOutAt: needsAccommodation === 'yes' ? checkOutAt : null,
    phone,
    message,
  }
}

rsvpForm.addEventListener('change', (event) => {
  if (event.target.name === 'needsAccommodation') {
    accommodationField.removeAttribute('aria-invalid')
    updateAccommodationFields()
  }
})
rsvpForm.elements.guestName.addEventListener('input', () => rsvpForm.elements.guestName.removeAttribute('aria-invalid'))
;[rsvpForm.elements.checkInAt, rsvpForm.elements.checkOutAt].forEach((field) => field.addEventListener('input', () => field.removeAttribute('aria-invalid')))
messageField.addEventListener('input', () => { messageCount.value = String(messageField.value.length) })

rsvpForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  rsvpError.hidden = true
  let submission
  try {
    submission = collectRsvp()
  } catch (error) {
    showRsvpError(error.message)
    return
  }

  rsvpSubmit.disabled = true
  rsvpSubmit.textContent = '正在送往鹈鹕镇……'
  try {
    const response = await fetch(rsvpConfig.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || '暂时无法保存，请稍后再试。')

    savedRsvp = { ...submission, id: result.id, editToken: result.editToken || submission.editToken, submitted: true }
    try { window.localStorage.setItem(rsvpStorageKey, JSON.stringify(savedRsvp)) } catch { /* The server submission still succeeded. */ }
    showRsvpSuccess(savedRsvp)
  } catch (error) {
    showRsvpError(error.message || '网络开小差了，请稍后再试。')
  } finally {
    rsvpSubmit.disabled = false
    rsvpSubmit.textContent = '保存赴约信息'
  }
})

document.querySelector('#rsvp-edit').addEventListener('click', () => {
  fillRsvpForm(savedRsvp)
  rsvpSuccess.hidden = true
  rsvpForm.hidden = false
  rsvpForm.scrollIntoView({ behavior: 'smooth', block: 'center' })
})

fillRsvpForm(savedRsvp)
}
