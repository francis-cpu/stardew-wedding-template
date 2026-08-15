import { randomToken, sha256, safeEqual } from '../_lib/crypto.js'
import { json, readJson } from '../_lib/http.js'

function text(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function dateTime(value) {
  const result = text(value, 16)
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(result) ? result : ''
}

function missingDatabase(env) {
  return !env?.DB || typeof env.DB.prepare !== 'function'
}

function configurationError() {
  return json({ error: 'RSVP 尚未完成配置，请联系邀请函所有者。' }, { status: 503 })
}

function validate(body) {
  const guestName = text(body.guestName, 30)
  const partySize = Number(body.partySize)
  const needsAccommodation = body.needsAccommodation
  const checkInAt = dateTime(body.checkInAt)
  const checkOutAt = dateTime(body.checkOutAt)
  const phone = text(body.phone, 20)
  const message = text(body.message, 200)

  if (!guestName) throw new Error('请填写宾客姓名。')
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 6) throw new Error('出席人数不正确。')
  if (typeof needsAccommodation !== 'boolean') throw new Error('请选择是否需要住宿。')
  if (needsAccommodation && (!checkInAt || !checkOutAt)) throw new Error('请填写完整的住宿时间。')
  if (needsAccommodation && checkOutAt <= checkInAt) throw new Error('退房时间必须晚于入住时间。')
  return {
    guestName,
    attendance: 'yes',
    partySize,
    needsAccommodation,
    checkInAt: needsAccommodation ? checkInAt : null,
    checkOutAt: needsAccommodation ? checkOutAt : null,
    phone,
    message,
  }
}

export async function onRequestPost({ request, env }) {
  if (missingDatabase(env)) return configurationError()
  let body
  let rsvp
  try {
    body = await readJson(request)
    rsvp = validate(body)
  } catch (error) {
    return json({ error: error.message || '填写的信息不正确。' }, { status: 400 })
  }

  const now = new Date().toISOString()
  if (body.id || body.editToken) {
    if (!body.id || !body.editToken) return json({ error: '缺少修改凭证。' }, { status: 401 })
    const existing = await env.DB.prepare('SELECT edit_token_hash FROM rsvps WHERE id = ?').bind(text(body.id, 80)).first()
    if (!existing || !safeEqual(existing.edit_token_hash, await sha256(String(body.editToken)))) {
      return json({ error: '修改凭证无效，请联系新人协助处理。' }, { status: 403 })
    }
    await env.DB.prepare(`
      UPDATE rsvps
      SET guest_name = ?, attendance = ?, party_size = ?, needs_accommodation = ?, check_in_at = ?, check_out_at = ?, phone = ?, message = ?, updated_at = ?
      WHERE id = ?
    `).bind(rsvp.guestName, rsvp.attendance, rsvp.partySize, Number(rsvp.needsAccommodation), rsvp.checkInAt, rsvp.checkOutAt, rsvp.phone, rsvp.message, now, body.id).run()
    return json({ id: body.id, updatedAt: now })
  }

  const id = crypto.randomUUID()
  const editToken = randomToken()
  await env.DB.prepare(`
    INSERT INTO rsvps (id, guest_name, attendance, party_size, needs_accommodation, check_in_at, check_out_at, phone, message, edit_token_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, rsvp.guestName, rsvp.attendance, rsvp.partySize, Number(rsvp.needsAccommodation), rsvp.checkInAt, rsvp.checkOutAt, rsvp.phone, rsvp.message, await sha256(editToken), now, now).run()
  return json({ id, editToken, createdAt: now }, { status: 201 })
}

export async function onRequestGet({ request, env }) {
  if (missingDatabase(env)) return configurationError()
  const url = new URL(request.url)
  const id = text(url.searchParams.get('id'), 80)
  const editToken = url.searchParams.get('token') || ''
  if (!id || !editToken) return json({ error: '缺少查询凭证。' }, { status: 401 })

  const row = await env.DB.prepare(`
    SELECT id, guest_name AS guestName, party_size AS partySize, needs_accommodation AS needsAccommodation,
      check_in_at AS checkInAt, check_out_at AS checkOutAt, phone, message, edit_token_hash AS editTokenHash
    FROM rsvps WHERE id = ?
  `).bind(id).first()
  if (!row || !safeEqual(row.editTokenHash, await sha256(editToken))) return json({ error: '查询凭证无效。' }, { status: 403 })
  delete row.editTokenHash
  row.needsAccommodation = Boolean(row.needsAccommodation)
  return json(row)
}
