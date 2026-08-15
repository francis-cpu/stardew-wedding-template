const loginView = document.querySelector('#login-view')
const dashboardView = document.querySelector('#dashboard-view')
const loginForm = document.querySelector('#admin-login-form')
const loginError = document.querySelector('#login-error')
const dashboardError = document.querySelector('#dashboard-error')
const guestList = document.querySelector('#guest-list')
const emptyList = document.querySelector('#empty-list')
const filter = document.querySelector('#accommodation-filter')
let rsvps = []

const beijingDateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function formatBeijingDateTime(value) {
  const parts = Object.fromEntries(beijingDateTimeFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}

function formatAccommodationDateTime(value) {
  return value ? value.replace('T', ' ') : '未填写'
}

function showLogin() {
  dashboardView.hidden = true
  loginView.hidden = false
}

function showDashboard() {
  loginView.hidden = true
  dashboardView.hidden = false
}

function appendText(parent, className, value) {
  const element = document.createElement('p')
  if (className) element.className = className
  element.textContent = value
  parent.append(element)
}

function renderStats() {
  document.querySelector('#stat-replies').textContent = String(rsvps.length)
  document.querySelector('#stat-guests').textContent = String(rsvps.reduce((total, rsvp) => total + rsvp.partySize, 0))
  document.querySelector('#stat-accommodation').textContent = String(rsvps.filter((rsvp) => Boolean(rsvp.needsAccommodation)).length)
}

function renderList() {
  guestList.replaceChildren()
  const visible = rsvps.filter((rsvp) => filter.value === 'all' || (filter.value === 'yes') === Boolean(rsvp.needsAccommodation))
  emptyList.hidden = visible.length > 0

  visible.forEach((rsvp) => {
    const entry = document.createElement('article')
    entry.className = 'guest-entry'

    const identity = document.createElement('div')
    const heading = document.createElement('h2')
    heading.textContent = rsvp.guestName
    identity.append(heading)
    appendText(identity, '', rsvp.phone || '未留电话')

    const accommodation = document.createElement('div')
    const badge = document.createElement('span')
    badge.className = `attendance-badge ${rsvp.needsAccommodation ? '' : 'no'}`
    badge.textContent = rsvp.needsAccommodation ? '需要住宿' : '无需住宿'
    accommodation.append(badge)

    const party = document.createElement('div')
    appendText(party, 'guest-entry-label', '出席人数')
    appendText(party, '', `${rsvp.partySize} 人`)

    const accommodationDates = document.createElement('div')
    appendText(accommodationDates, 'guest-entry-label', '住宿时间')
    appendText(accommodationDates, '', rsvp.needsAccommodation
      ? `${formatAccommodationDateTime(rsvp.checkInAt)} 至 ${formatAccommodationDateTime(rsvp.checkOutAt)}`
      : '无需住宿')

    const message = document.createElement('div')
    appendText(message, 'guest-entry-label', '留言祝福')
    appendText(message, 'guest-message', rsvp.message || '没有留言')

    const date = document.createElement('div')
    appendText(date, 'guest-entry-label', '最后更新')
    appendText(date, 'guest-date', formatBeijingDateTime(rsvp.updatedAt))
    entry.append(identity, accommodation, party, accommodationDates, message, date)
    guestList.append(entry)
  })
}

async function loadRsvps() {
  dashboardError.hidden = true
  const response = await fetch('/api/admin/rsvps', { headers: { Accept: 'application/json' } })
  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    showLogin()
    return false
  }
  if (response.status === 401) {
    showLogin()
    return false
  }
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || '无法读取宾客登记簿。')
  rsvps = result.rsvps || []
  showDashboard()
  renderStats()
  renderList()
  return true
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  loginError.hidden = true
  const button = loginForm.querySelector('button')
  button.disabled = true
  button.textContent = '正在验证钥匙……'
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: loginForm.elements.password.value }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || '无法登录。')
    loginForm.reset()
    await loadRsvps()
  } catch (error) {
    loginError.textContent = error.message
    loginError.hidden = false
  } finally {
    button.disabled = false
    button.textContent = '打开登记簿'
  }
})

document.querySelector('#logout-button').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
  rsvps = []
  showLogin()
})

document.querySelector('#refresh-button').addEventListener('click', async () => {
  try { await loadRsvps() } catch (error) {
    dashboardError.textContent = error.message
    dashboardError.hidden = false
  }
})

filter.addEventListener('change', renderList)

document.querySelector('#export-button').addEventListener('click', () => {
  const escapeCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const rows = [['姓名', '出席人数', '是否需要住宿', '入住时间', '退房时间', '联系电话', '留言祝福', '提交时间', '更新时间']]
  rsvps.forEach((rsvp) => rows.push([
    rsvp.guestName,
    rsvp.partySize,
    rsvp.needsAccommodation ? '需要' : '无需',
    rsvp.needsAccommodation ? formatAccommodationDateTime(rsvp.checkInAt) : '',
    rsvp.needsAccommodation ? formatAccommodationDateTime(rsvp.checkOutAt) : '',
    rsvp.phone,
    rsvp.message,
    formatBeijingDateTime(rsvp.createdAt),
    formatBeijingDateTime(rsvp.updatedAt),
  ]))
  const blob = new Blob([`\uFEFF${rows.map((row) => row.map(escapeCell).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `婚礼宾客名单-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
})

loadRsvps().catch((error) => {
  loginError.textContent = error.message
  loginError.hidden = false
  showLogin()
})

