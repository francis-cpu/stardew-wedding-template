import { access } from 'node:fs/promises'
import { deployRsvp, withLocalWranglerConfig } from './lib/deploy-rsvp.js'
import { runCommand } from './lib/run-command.js'

const localEnvironmentUrl = new URL('../.env.rsvp.local', import.meta.url)
const localWranglerUrl = new URL('../wrangler.rsvp.jsonc', import.meta.url)
const wranglerUrl = new URL('../wrangler.jsonc', import.meta.url)

async function exists(url) {
  try {
    await access(url)
    return true
  } catch {
    return false
  }
}

deployRsvp({
  hasLocalWrangler: await exists(localWranglerUrl),
  hasEnableMarker: await exists(localEnvironmentUrl),
  run: runCommand,
  withLocalWrangler: (callback) => withLocalWranglerConfig({
    defaultConfigUrl: wranglerUrl,
    localConfigUrl: localWranglerUrl,
  }, callback),
}).catch((error) => {
  console.error(`\n部署失败：${error.message}`)
  process.exitCode = 1
})
