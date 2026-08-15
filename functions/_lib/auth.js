import { base64UrlToBytes, bytesToBase64Url, safeEqual } from './crypto.js'

const encoder = new TextEncoder()
const sessionName = 'stardew_admin_session'
const sessionLifetime = 8 * 60 * 60

async function signature(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return bytesToBase64Url(new Uint8Array(signed))
}

export async function createSessionCookie(secret) {
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + sessionLifetime })))
  const token = `${payload}.${await signature(payload, secret)}`
  return `${sessionName}=${token}; Path=/; Max-Age=${sessionLifetime}; HttpOnly; Secure; SameSite=Strict`
}

export function clearSessionCookie() {
  return `${sessionName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`
}

export async function isAdmin(request, secret) {
  if (!secret) return false
  const cookie = request.headers.get('Cookie') || ''
  const token = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${sessionName}=`))?.slice(sessionName.length + 1)
  if (!token) return false
  const [payload, receivedSignature] = token.split('.')
  if (!payload || !receivedSignature || !safeEqual(receivedSignature, await signature(payload, secret))) return false
  try {
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)))
    return Number(session.exp) > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}
