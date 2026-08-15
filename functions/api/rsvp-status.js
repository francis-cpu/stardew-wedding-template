export function onRequestGet({ env }) {
  const enabled = Boolean(
    env?.DB && typeof env.DB.prepare === 'function'
    && env?.ADMIN_PASSWORD
    && env?.SESSION_SECRET,
  )
  return Response.json({ enabled }, { headers: { 'Cache-Control': 'no-store' } })
}
