import baseConfig from './config/rsvp.json' with { type: 'json' }

export function resolveRsvpConfig(config, override) {
  return { ...config, enabled: config.enabled || override === 'true' }
}

export default resolveRsvpConfig(baseConfig, import.meta.env?.VITE_RSVP_ENABLED)
