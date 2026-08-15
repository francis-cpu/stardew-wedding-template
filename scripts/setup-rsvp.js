import { randomBytes } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stdin as input, stdout as output } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { configureWranglerProject } from './lib/cloudflare-config.js'
import { deployRsvp, withLocalWranglerConfig } from './lib/deploy-rsvp.js'
import { runCommand as run } from './lib/run-command.js'
import { configureRsvp } from './lib/setup-rsvp.js'

const wranglerConfigUrl = new URL('../wrangler.jsonc', import.meta.url)
const localEnvironmentUrl = new URL('../.env.rsvp.local', import.meta.url)
const localWranglerUrl = new URL('../wrangler.rsvp.jsonc', import.meta.url)

function parseJsonc(source) {
  return JSON.parse(source
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*([}\]])/g, '$1'))
}

async function uploadSecrets(projectName, secrets) {
  const directory = await mkdtemp(join(tmpdir(), 'stardew-rsvp-'))
  const file = join(directory, 'secrets.json')
  try {
    await writeFile(file, JSON.stringify(secrets), { mode: 0o600 })
    await run('wrangler', ['pages', 'secret', 'bulk', file, '--project-name', projectName], { stdio: 'inherit' })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function ensureLogin() {
  try {
    await run('wrangler', ['whoami'])
  } catch {
    await run('wrangler', ['login'], { stdio: 'inherit' })
  }
}

async function ensureD1Binding(projectName) {
  let source
  try {
    source = await readFile(localWranglerUrl, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    source = await readFile(wranglerConfigUrl, 'utf8')
  }
  let config = configureWranglerProject(
    parseJsonc(source),
    projectName,
  )
  await writeFile(localWranglerUrl, `${JSON.stringify(config, null, 2)}\n`)
  if (config.d1_databases?.some((binding) => binding.binding === 'DB')) return

  const databaseName = `${projectName}-rsvp`
  const databases = JSON.parse(await run('wrangler', ['d1', 'list', '--json']))
  const existing = databases.find((database) => database.name === databaseName)
  if (!existing) {
    await run('wrangler', ['d1', 'create', databaseName, '--binding', 'DB', '--update-config', '--use-remote', '--config', 'wrangler.rsvp.jsonc'], { stdio: 'inherit' })
    return
  }

  config = configureWranglerProject(config, projectName, existing)
  await writeFile(localWranglerUrl, `${JSON.stringify(config, null, 2)}\n`)
}

async function readLocalRsvpState() {
  try {
    return await readFile(localEnvironmentUrl, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function restoreLocalRsvp(value) {
  if (value === null) {
    await rm(localEnvironmentUrl, { force: true })
    return
  }
  await writeFile(localEnvironmentUrl, value)
}

async function deploy() {
  await deployRsvp({
    hasLocalWrangler: true,
    hasEnableMarker: (await readLocalRsvpState()) !== null,
    run,
    withLocalWrangler: (callback) => withLocalWranglerConfig({
      defaultConfigUrl: wranglerConfigUrl,
      localConfigUrl: localWranglerUrl,
    }, callback),
  })
}

async function readHidden(label) {
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    throw new Error('管理员密码必须在交互式终端中输入。')
  }
  output.write(label)
  input.setRawMode(true)
  input.resume()
  return new Promise((resolve, reject) => {
    let value = ''
    let finished = false
    const finish = (error) => {
      if (finished) return
      finished = true
      input.off('data', onData)
      input.setRawMode(false)
      input.pause()
      output.write('\n')
      error ? reject(error) : resolve(value)
    }
    const onData = (chunk) => {
      for (const key of chunk.toString()) {
        if (key === '\u0003') return finish(new Error('用户取消配置。'))
        if (key === '\r' || key === '\n') return finish()
        if (key === '\u007f') {
          if (value) {
            value = value.slice(0, -1)
            output.write('\b \b')
          }
        } else {
          value += key
          output.write('*')
        }
      }
    }
    input.on('data', onData)
  })
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function verifyDeployment(projectName) {
  const origin = `https://${projectName}.pages.dev`
  let lastError
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      for (const path of ['/', '/admin/']) {
        const response = await fetch(`${origin}${path}`)
        if (!response.ok) throw new Error(`${path} 返回 ${response.status}`)
      }
      const status = await fetch(`${origin}/api/rsvp-status`)
      const body = status.ok ? await status.json() : null
      if (!body?.enabled) throw new Error('D1 或 Secret 尚未生效')
      return
    } catch (error) {
      lastError = error
      if (attempt < 8) await delay(1500)
    }
  }
  throw new Error(`部署验证失败：${lastError?.message || '未知错误'}。`)
}

async function main() {
  const prompt = createInterface({ input, output })
  const projectName = await prompt.question('Pages 项目名：')
  prompt.close()
  const adminPassword = await readHidden('管理员密码（至少 6 个字符）：')

  await configureRsvp({ projectName, adminPassword }, {
    run,
    readLocalRsvpState,
    enableLocalRsvp: async () => writeFile(localEnvironmentUrl, 'VITE_RSVP_ENABLED=true\n'),
    restoreLocalRsvp,
    ensureLogin,
    ensureD1Binding,
    uploadSecrets,
    deploy,
    verifyDeployment,
    randomSecret: () => randomBytes(48).toString('base64url'),
    log: console.log,
  })
}

main().catch((error) => {
  console.error(`\n配置失败：${error.message}`)
  process.exitCode = 1
})
