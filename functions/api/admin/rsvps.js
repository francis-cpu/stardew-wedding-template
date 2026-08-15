import { isAdmin } from '../../_lib/auth.js'
import { json } from '../../_lib/http.js'

export async function onRequestGet({ request, env }) {
  if (!await isAdmin(request, env?.SESSION_SECRET)) return json({ error: '请先登录管理后台。' }, { status: 401 })
  if (!env?.DB || typeof env.DB.prepare !== 'function') return json({ error: '管理后台尚未完成配置。' }, { status: 503 })

  const { results } = await env.DB.prepare(`
    SELECT id, guest_name AS guestName, party_size AS partySize,
      needs_accommodation AS needsAccommodation, check_in_at AS checkInAt, check_out_at AS checkOutAt,
      phone, message, created_at AS createdAt, updated_at AS updatedAt
    FROM rsvps ORDER BY updated_at DESC
  `).all()
  return json({ rsvps: results })
}
