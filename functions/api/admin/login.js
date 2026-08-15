import { createSessionCookie } from '../../_lib/auth.js'
import { safeEqual } from '../../_lib/crypto.js'
import { json, readJson } from '../../_lib/http.js'

const attemptWindow = 15 * 60 * 1000
const blockDuration = 30 * 60 * 1000
const maxAttempts = 5

export async function onRequestPost({ request, env }) {
  if (!env?.DB || typeof env.DB.prepare !== 'function' || !env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return json({ error: '管理后台尚未完成配置。' }, { status: 503 })
  }
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const now = Date.now()
  const record = await env.DB.prepare('SELECT attempts, first_attempt_at, blocked_until FROM admin_login_attempts WHERE ip = ?').bind(ip).first()
  if (record?.blocked_until > now) return json({ error: '尝试次数过多，请稍后再试。' }, { status: 429 })

  let password = ''
  try {
    const body = await readJson(request)
    password = String(body.password || '')
  } catch {
    return json({ error: '请输入管理密码。' }, { status: 400 })
  }

  if (!safeEqual(password, env.ADMIN_PASSWORD)) {
    const withinWindow = record && now - record.first_attempt_at < attemptWindow
    const attempts = withinWindow ? record.attempts + 1 : 1
    const firstAttemptAt = withinWindow ? record.first_attempt_at : now
    const blockedUntil = attempts >= maxAttempts ? now + blockDuration : 0
    await env.DB.prepare(`
      INSERT INTO admin_login_attempts (ip, attempts, first_attempt_at, blocked_until) VALUES (?, ?, ?, ?)
      ON CONFLICT(ip) DO UPDATE SET attempts = excluded.attempts, first_attempt_at = excluded.first_attempt_at, blocked_until = excluded.blocked_until
    `).bind(ip, attempts, firstAttemptAt, blockedUntil).run()
    return json({ error: attempts >= maxAttempts ? '尝试次数过多，已暂时锁定。' : '管理密码不正确。' }, { status: 401 })
  }

  await env.DB.prepare('DELETE FROM admin_login_attempts WHERE ip = ?').bind(ip).run()
  return json({ ok: true }, { headers: { 'Set-Cookie': await createSessionCookie(env.SESSION_SECRET) } })
}
