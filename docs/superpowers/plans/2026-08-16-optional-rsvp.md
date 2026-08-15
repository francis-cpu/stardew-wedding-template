# 可选 RSVP 模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在婚礼模板中加入默认关闭、可通过一条交互命令开启的 Cloudflare Pages RSVP、住宿登记和管理后台能力。

**Architecture:** RSVP 的前端状态保存在独立的 `config/rsvp.json` 中；默认关闭时 HTML 入口保持隐藏，主脚本不加载 RSVP 模块。开启向导通过 Wrangler 创建并绑定 D1、执行迁移、写入 Pages Secret、修改配置并部署；Pages Functions 与管理后台沿用已验证的同域实现。

**Tech Stack:** Vite、原生 HTML/CSS/JavaScript、Node.js `node:test`、Cloudflare Pages Functions、D1、Wrangler

---

## 文件结构

- Create: `config/rsvp.default.json` — 用于回归测试和恢复关闭状态的出厂默认值。
- Create: `config/rsvp.json` — 实际 RSVP 功能开关与 API 路径；向导只修改此文件。
- Modify: `index.html` — 默认隐藏的 RSVP 表单、成功状态和浮动入口。
- Modify: `app.js` — 只在开关开启时显示入口并动态加载 RSVP 客户端。
- Create: `rsvp-client.js` — 表单校验、提交、修改和 localStorage 凭证处理。
- Modify: `style.css` — RSVP 表单及成功状态样式。
- Create: `functions/api/rsvp.js` — 宾客提交、读取和修改接口。
- Create: `functions/api/rsvp-status.js` — setup 部署后的公开配置健康检查。
- Create: `functions/api/admin/*.js` — 管理员登录、退出和宾客列表接口。
- Create: `functions/_lib/*.js` — HTTP、密码学和管理员会话工具。
- Create: `migrations/*.sql` — RSVP 与住宿字段的 D1 迁移。
- Create: `admin/index.html`, `admin/admin.js`, `admin/admin-enabled.js`, `admin/admin.css` — 默认关闭外壳与按需加载的管理后台。
- Create: `scripts/setup-rsvp.js` — 交互入口，只负责收集输入和调用编排层。
- Create: `scripts/lib/setup-rsvp.js` — 可注入依赖、可测试的 Cloudflare 配置编排器。
- Create: `wrangler.jsonc` — Pages 输出目录和 setup 后写入的 D1 绑定。
- Modify: `vite.config.js` — 同时构建邀请函与管理后台。
- Modify: `package.json` — 测试、Cloudflare 本地开发、setup 和部署命令。
- Modify: `README.md` — 完整开启、验证、更新、关闭、清理、排障和隐私指南。
- Create: `tests/*.test.js` — 默认关闭、API、setup、管理后台和 README 回归测试。

### Task 1: 建立默认关闭的功能边界

**Files:**
- Create: `config/rsvp.json`
- Create: `tests/rsvp-feature-flag.test.js`
- Modify: `index.html`
- Modify: `app.js`

- [ ] **Step 1: 写入默认关闭的失败测试**

创建 `tests/rsvp-feature-flag.test.js`：

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('ships RSVP disabled and hidden by default', async () => {
  const defaults = JSON.parse(await read('config/rsvp.default.json'))
  const config = JSON.parse(await read('config/rsvp.json'))
  const html = await read('index.html')

  assert.deepEqual(defaults, { enabled: false, apiUrl: '/api/rsvp' })
  assert.equal(typeof config.enabled, 'boolean')
  assert.equal(config.apiUrl, defaults.apiUrl)
  assert.match(html, /<section class="rsvp story-section" id="rsvp" data-rsvp-ui hidden>/)
  assert.match(html, /data-rsvp-shortcut hidden/)
})

test('loads RSVP client only after the feature is enabled', async () => {
  const app = await read('app.js')

  assert.match(app, /import rsvpConfig from '.\/config\/rsvp\.json' with \{ type: 'json' \}/)
  assert.match(app, /if \(rsvpConfig\.enabled\) \{/)
  assert.match(app, /import\('.\/rsvp-client\.js'\)/)
})
```

- [ ] **Step 2: 运行测试并确认失败原因正确**

Run: `node --test tests/rsvp-feature-flag.test.js`

Expected: FAIL with `ENOENT` for `config/rsvp.json`。

- [ ] **Step 3: 创建唯一配置文件**

创建 `config/rsvp.json`：

```json
{
  "enabled": false,
  "apiUrl": "/api/rsvp"
}
```

- [ ] **Step 4: 添加默认隐藏的 RSVP HTML**

从已验证项目 `/Users/zhoujingtian/Desktop/stardew/index.html` 复制 `#rsvp` section 到模板的 `#guests` 之前，并把开始标签改成：

```html
      <section class="rsvp story-section" id="rsvp" data-rsvp-ui hidden>
```

从同一来源复制浮动 RSVP 按钮，并为它增加默认隐藏标记：

```html
      <button class="tool-slot" type="button" data-scroll="#rsvp" data-rsvp-shortcut hidden aria-label="填写赴约信息"><svg><use href="#icon-leaf" /></svg></button>
```

- [ ] **Step 5: 只在启用时显示入口并加载客户端**

在 `app.js` 第一行加入配置导入，并在页面通用内容初始化完成后加入：

```js
import rsvpConfig from './config/rsvp.json' with { type: 'json' }

if (rsvpConfig.enabled) {
  document.querySelectorAll('[data-rsvp-ui], [data-rsvp-shortcut]').forEach((element) => {
    element.hidden = false
  })
  import('./rsvp-client.js').then(({ initializeRsvp }) => initializeRsvp(rsvpConfig))
}
```

先创建空的 `rsvp-client.js`，让动态导入可解析：

```js
// Loaded only when config/rsvp.json enables guest registration.
```

- [ ] **Step 6: 运行测试并确认通过**

Run: `node --test tests/rsvp-feature-flag.test.js && npm run build`

Expected: 2 tests passed；Vite build exits 0；默认构建不显示 RSVP 入口。

- [ ] **Step 7: 提交默认关闭边界**

```bash
git add config/rsvp.json tests/rsvp-feature-flag.test.js index.html app.js rsvp-client.js
git commit -m "feat(rsvp): 添加默认关闭的功能开关"
```

### Task 2: 移植 Pages Functions、D1 迁移与 API 测试

**Files:**
- Create: `functions/api/rsvp.js`
- Create: `functions/api/rsvp-status.js`
- Create: `functions/api/admin/login.js`
- Create: `functions/api/admin/logout.js`
- Create: `functions/api/admin/rsvps.js`
- Create: `functions/_lib/auth.js`
- Create: `functions/_lib/crypto.js`
- Create: `functions/_lib/http.js`
- Create: `migrations/0001_create_rsvps.sql`
- Create: `migrations/0002_add_rsvp_accommodation.sql`
- Create: `tests/rsvp-accommodation.test.js`
- Create: `tests/rsvp-configuration.test.js`

- [ ] **Step 1: 写入缺少绑定与 Secret 的失败测试**

创建 `tests/rsvp-configuration.test.js`：

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { onRequestPost as submitRsvp } from '../functions/api/rsvp.js'
import { onRequestGet as rsvpStatus } from '../functions/api/rsvp-status.js'
import { onRequestPost as login } from '../functions/api/admin/login.js'

test('returns a configuration error when DB is missing', async () => {
  const response = await submitRsvp({
    request: new Request('https://example.test/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestName: '测试宾客', partySize: 1, needsAccommodation: false }),
    }),
    env: {},
  })

  assert.equal(response.status, 503)
  assert.equal((await response.json()).error, 'RSVP 尚未完成配置，请联系邀请函所有者。')
})

test('returns a configuration error when admin secrets are missing', async () => {
  const response = await login({
    request: new Request('https://example.test/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'example' }),
    }),
    env: {},
  })

  assert.equal(response.status, 503)
  assert.equal((await response.json()).error, '管理后台尚未完成配置。')
})

test('reports whether all RSVP bindings and secrets are ready', async () => {
  const disabled = await rsvpStatus({ env: {} })
  assert.deepEqual(await disabled.json(), { enabled: false })

  const enabled = await rsvpStatus({
    env: {
      DB: { prepare() {} },
      ADMIN_PASSWORD: 'configured',
      SESSION_SECRET: 'configured',
    },
  })
  assert.deepEqual(await enabled.json(), { enabled: true })
})
```

- [ ] **Step 2: 运行测试并确认模块缺失**

Run: `node --test tests/rsvp-configuration.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `functions/api/rsvp.js`。

- [ ] **Step 3: 复制已验证的服务端实现与迁移**

从同一工作区的已验证婚礼项目机械复制以下文件；不要改写加密、会话、限流或 SQL 行为：

```bash
cp -R /Users/zhoujingtian/Desktop/stardew/functions ./functions
cp -R /Users/zhoujingtian/Desktop/stardew/migrations ./migrations
cp /Users/zhoujingtian/Desktop/stardew/tests/rsvp-accommodation.test.js ./tests/rsvp-accommodation.test.js
```

- [ ] **Step 4: 在 API 边界加入明确配置错误**

在 `functions/api/rsvp.js` 的每个导出处理器最前面使用：

```js
function missingDatabase(env) {
  return !env?.DB || typeof env.DB.prepare !== 'function'
}

function configurationError() {
  return json({ error: 'RSVP 尚未完成配置，请联系邀请函所有者。' }, 503)
}
```

所有访问 D1 的处理器在解析请求前执行：

```js
if (missingDatabase(env)) return configurationError()
```

在 `functions/api/admin/login.js` 处理器最前面执行：

```js
if (!env?.ADMIN_PASSWORD || !env?.SESSION_SECRET) {
  return json({ error: '管理后台尚未完成配置。' }, 503)
}
```

创建 `functions/api/rsvp-status.js`：

```js
export function onRequestGet({ env }) {
  const enabled = Boolean(
    env?.DB && typeof env.DB.prepare === 'function'
    && env?.ADMIN_PASSWORD
    && env?.SESSION_SECRET,
  )
  return Response.json({ enabled }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
```

- [ ] **Step 5: 运行 API 测试**

Run: `node --test tests/rsvp-configuration.test.js tests/rsvp-accommodation.test.js`

Expected: 5 tests passed；缺少配置返回 503，状态接口反映绑定完整性，住宿日期校验保持通过。

- [ ] **Step 6: 提交服务端能力**

```bash
git add functions migrations tests/rsvp-configuration.test.js tests/rsvp-accommodation.test.js
git commit -m "feat(rsvp): 添加 Pages Functions 与 D1 数据层"
```

### Task 3: 完成按需加载的 RSVP 客户端

**Files:**
- Modify: `rsvp-client.js`
- Modify: `style.css`
- Create: `tests/rsvp-client.test.js`

- [ ] **Step 1: 写入客户端模块边界测试**

创建 `tests/rsvp-client.test.js`：

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../rsvp-client.js', import.meta.url), 'utf8')

test('uses the configured API and preserves edits locally', () => {
  assert.doesNotMatch(source, /import rsvpConfig/)
  assert.match(source, /export function initializeRsvp\(rsvpConfig\)/)
  assert.match(source, /fetch\(rsvpConfig\.apiUrl/)
  assert.match(source, /stardew-wedding-rsvp/)
})

test('keeps accommodation validation in the optional client', () => {
  assert.match(source, /退房时间必须晚于入住时间/)
  assert.match(source, /needsAccommodation/)
  assert.match(source, /checkInAt/)
  assert.match(source, /checkOutAt/)
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/rsvp-client.test.js`

Expected: FAIL because the initial empty module has no API or validation logic。

- [ ] **Step 3: 移植客户端逻辑**

将 `/Users/zhoujingtian/Desktop/stardew/app.js` 中从 `const rsvpForm` 到 `fillRsvpForm(savedRsvp)` 的完整逻辑复制到 `rsvp-client.js`，作为导出函数 `initializeRsvp(rsvpConfig)` 的函数体。

由 `app.js` 动态导入后调用 `initializeRsvp(rsvpConfig)`，把原实现中的：

```js
fetch(weddingConfig.rsvpApiUrl, {
```

替换为：

```js
fetch(rsvpConfig.apiUrl, {
```

不要把 RSVP 查询、事件监听或 localStorage 逻辑留在 `app.js`。

- [ ] **Step 4: 移植 RSVP 样式**

从 `/Users/zhoujingtian/Desktop/stardew/style.css` 复制以下选择器及其响应式规则到模板 `style.css`：

```text
.rsvp
.rsvp-card
.rsvp-card-title
.form-field
.attendance-field
.attendance-options
.form-error
.form-note
.rsvp-submit
.rsvp-success
```

同时增加通用隐藏保障：

```css
[hidden] { display: none !important; }
```

- [ ] **Step 5: 运行客户端与构建测试**

Run: `node --test tests/rsvp-client.test.js tests/rsvp-feature-flag.test.js && npm run build`

Expected: 4 tests passed；build exits 0；默认关闭构建不会输出 RSVP chunk，Task 7 再验证开启构建会输出该 chunk。

- [ ] **Step 6: 提交客户端**

```bash
git add rsvp-client.js style.css tests/rsvp-client.test.js
git commit -m "feat(rsvp): 添加按需加载的宾客登记表单"
```

### Task 4: 添加默认安全关闭的管理后台

**Files:**
- Create: `admin/index.html`
- Create: `admin/admin.js`
- Create: `admin/admin-enabled.js`
- Create: `admin/admin.css`
- Modify: `vite.config.js`
- Create: `tests/admin-feature-flag.test.js`

- [ ] **Step 1: 写入管理后台关闭状态测试**

创建 `tests/admin-feature-flag.test.js`：

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../admin/index.html', import.meta.url), 'utf8')
const script = await readFile(new URL('../admin/admin.js', import.meta.url), 'utf8')

test('shows setup guidance and skips admin API while RSVP is disabled', () => {
  assert.match(html, /id="rsvp-disabled"/)
  assert.match(html, /RSVP 默认关闭/)
  assert.match(script, /if \(!rsvpConfig\.enabled\)/)
  assert.match(script, /document\.querySelector\('#rsvp-disabled'\)\.hidden = false/)
  assert.match(script, /else \{\s*import\('\.\/admin-enabled\.js'\)/)
})
```

- [ ] **Step 2: 运行测试并确认管理页面缺失**

Run: `node --test tests/admin-feature-flag.test.js`

Expected: FAIL with `ENOENT` for `admin/index.html`。

- [ ] **Step 3: 复制已验证的管理后台**

```bash
cp -R /Users/zhoujingtian/Desktop/stardew/admin ./admin
mv admin/admin.js admin/admin-enabled.js
```

在 `admin/index.html` 的 `<main>` 开头加入：

```html
<section class="admin-disabled" id="rsvp-disabled" hidden>
  <h1>RSVP 默认关闭</h1>
  <p>当前邀请函没有启用宾客登记。请回到项目根目录运行 <code>npm run setup:rsvp</code>。</p>
  <a href="/">返回邀请函</a>
</section>
```

- [ ] **Step 4: 用配置开关包围后台启动逻辑**

创建轻量入口 `admin/admin.js`；关闭时只显示说明，不解析或加载任何登录、列表或导出逻辑：

```js
import rsvpConfig from '../config/rsvp.json' with { type: 'json' }

if (!rsvpConfig.enabled) {
  document.querySelector('#rsvp-disabled').hidden = false
  document.querySelector('#admin-app').hidden = true
} else {
  import('./admin-enabled.js')
}
```

给原后台根容器增加 `id="admin-app"`，并在 `admin/admin.css` 中加入：

```css
.admin-disabled { max-width: 640px; margin: 64px auto; padding: 24px; }
.admin-disabled code { word-break: break-all; }
```

- [ ] **Step 5: 配置多入口构建**

把 `vite.config.js` 改为：

```js
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
      },
    },
  },
})
```

- [ ] **Step 6: 运行后台测试与构建**

Run: `node --test tests/admin-feature-flag.test.js && npm run build && test -f dist/admin/index.html`

Expected: 1 test passed；build exits 0；`dist/admin/index.html` exists。

- [ ] **Step 7: 提交管理后台**

```bash
git add admin vite.config.js tests/admin-feature-flag.test.js
git commit -m "feat(rsvp): 添加可选管理后台"
```

### Task 5: 实现可回滚、可重复执行的 setup 编排器

**Files:**
- Create: `scripts/lib/setup-rsvp.js`
- Create: `scripts/setup-rsvp.js`
- Create: `tests/setup-rsvp.test.js`
- Create: `wrangler.jsonc`
- Modify: `package.json`

- [ ] **Step 1: 写入首次配置与失败回滚测试**

创建 `tests/setup-rsvp.test.js`：

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { configureRsvp } from '../scripts/lib/setup-rsvp.js'

function harness({ failAt } = {}) {
  const calls = []
  let config = { enabled: false, apiUrl: '/api/rsvp' }
  return {
    calls,
    get config() { return config },
    deps: {
      async run(command, args, options = {}) {
        calls.push([command, args, options])
        if (args.includes(failAt)) throw new Error(`failed at ${failAt}`)
        if (args.includes('list')) return JSON.stringify([])
        return ''
      },
      async readRsvpConfig() { return structuredClone(config) },
      async writeRsvpConfig(value) { config = structuredClone(value) },
      async ensureLogin() { calls.push(['ensureLogin']) },
      async ensureD1Binding() { calls.push(['ensureD1Binding']) },
      async uploadSecrets() { calls.push(['uploadSecrets']) },
      async verifyDeployment() { calls.push(['verifyDeployment']) },
      randomSecret() { return 's'.repeat(64) },
      log() {},
    },
  }
}

test('configures cloud resources before enabling RSVP', async () => {
  const state = harness()
  await configureRsvp({ projectName: 'wedding-demo', adminPassword: 'a-strong-password' }, state.deps)

  assert.equal(state.config.enabled, true)
  const deployIndex = state.calls.findIndex((call) => call[1]?.includes('deploy'))
  const verifyIndex = state.calls.findIndex((call) => call[0] === 'verifyDeployment')
  assert.ok(deployIndex > -1)
  assert.ok(verifyIndex > deployIndex)
})

test('restores the disabled config when deployment fails', async () => {
  const state = harness({ failAt: 'deploy' })

  await assert.rejects(
    configureRsvp({ projectName: 'wedding-demo', adminPassword: 'a-strong-password' }, state.deps),
    /failed at deploy/,
  )
  assert.equal(state.config.enabled, false)
})
```

- [ ] **Step 2: 运行测试并确认编排器缺失**

Run: `node --test tests/setup-rsvp.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/lib/setup-rsvp.js`。

- [ ] **Step 3: 实现纯编排核心**

创建 `scripts/lib/setup-rsvp.js`：

```js
export async function configureRsvp(input, deps) {
  const original = await deps.readRsvpConfig()
  let deployedEnabledBuild = false
  const projectName = input.projectName.trim()
  if (!/^[a-z0-9-]{1,58}$/.test(projectName)) throw new Error('Pages 项目名只能包含小写字母、数字和连字符。')
  if (input.adminPassword.length < 12) throw new Error('管理员密码至少需要 12 个字符。')

  try {
    await deps.ensureLogin()
    const projects = JSON.parse(await deps.run('wrangler', ['pages', 'project', 'list', '--json']))
    if (!projects.some((project) => project.name === projectName)) {
      await deps.run('wrangler', ['pages', 'project', 'create', projectName, '--production-branch', 'main'], { stdio: 'inherit' })
    }

    await deps.ensureD1Binding(projectName)
    await deps.run('wrangler', ['d1', 'migrations', 'apply', 'DB', '--remote'], { stdio: 'inherit' })
    await deps.uploadSecrets(projectName, {
      ADMIN_PASSWORD: input.adminPassword,
      SESSION_SECRET: deps.randomSecret(),
    })
    await deps.writeRsvpConfig({ ...original, enabled: true })
    await deps.run('npm', ['test'], { stdio: 'inherit' })
    await deps.run('npm', ['run', 'build'], { stdio: 'inherit' })
    await deps.run('wrangler', ['pages', 'deploy', 'dist', '--project-name', projectName], { stdio: 'inherit' })
    deployedEnabledBuild = true
    await deps.verifyDeployment(projectName)
  } catch (error) {
    await deps.writeRsvpConfig(original)
    if (deployedEnabledBuild) {
      await deps.run('npm', ['run', 'build'], { stdio: 'inherit' })
      await deps.run('wrangler', ['pages', 'deploy', 'dist', '--project-name', projectName], { stdio: 'inherit' })
    }
    throw error
  }
}
```

- [ ] **Step 4: 实现 CLI 适配层**

创建 `scripts/setup-rsvp.js`，职责限定为：

```js
import { randomBytes } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { configureRsvp } from './lib/setup-rsvp.js'

const rsvpConfigUrl = new URL('../config/rsvp.json', import.meta.url)

function run(command, args, options = {}) {
  const executable = command === 'wrangler' ? process.platform === 'win32' ? 'npx.cmd' : 'npx' : command
  const finalArgs = command === 'wrangler' ? ['wrangler', ...args] : args
  return new Promise((resolve, reject) => {
    const child = spawn(executable, finalArgs, { ...options, shell: false })
    let stdout = ''
    child.stdout?.on('data', (chunk) => { stdout += chunk })
    child.on('error', reject)
    child.on('exit', (code) => code === 0 ? resolve(stdout) : reject(new Error(`${command} ${args.join(' ')} 执行失败（退出码 ${code}）。`)))
  })
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
  const configUrl = new URL('../wrangler.jsonc', import.meta.url)
  const config = JSON.parse(await readFile(configUrl, 'utf8'))
  if (config.d1_databases?.some((binding) => binding.binding === 'DB')) return

  const databaseName = `${projectName}-rsvp`
  const databases = JSON.parse(await run('wrangler', ['d1', 'list', '--json']))
  const existing = databases.find((database) => database.name === databaseName)
  if (!existing) {
    await run('wrangler', ['d1', 'create', databaseName, '--binding', 'DB', '--update-config', '--use-remote'], { stdio: 'inherit' })
    return
  }

  config.d1_databases = [{
    binding: 'DB',
    database_name: databaseName,
    database_id: existing.uuid,
  }]
  await writeFile(configUrl, `${JSON.stringify(config, null, 2)}\n`)
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
    const finish = (error) => {
      input.off('data', onData)
      input.setRawMode(false)
      input.pause()
      output.write('\n')
      error ? reject(error) : resolve(value)
    }
    const onData = (chunk) => {
      const key = chunk.toString()
      if (key === '\u0003') return finish(new Error('用户取消配置。'))
      if (key === '\r' || key === '\n') return finish()
      if (key === '\u007f') {
        if (value) {
          value = value.slice(0, -1)
          output.write('\b \b')
        }
        return
      }
      value += key
      output.write('*')
    }
    input.on('data', onData)
  })
}

async function verifyDeployment(projectName) {
  const origin = `https://${projectName}.pages.dev`
  for (const path of ['/', '/admin/']) {
    const response = await fetch(`${origin}${path}`)
    if (!response.ok) throw new Error(`部署验证失败：${path} 返回 ${response.status}。`)
  }
  const status = await fetch(`${origin}/api/rsvp-status`)
  const body = status.ok ? await status.json() : null
  if (!body?.enabled) throw new Error('部署验证失败：RSVP 的 D1 或 Secret 尚未生效。')
}

const prompt = createInterface({ input, output })
const projectName = await prompt.question('Pages 项目名：')
prompt.close()
const adminPassword = await readHidden('管理员密码（至少 12 个字符）：')

await configureRsvp({ projectName, adminPassword }, {
  run,
  readRsvpConfig: async () => JSON.parse(await readFile(rsvpConfigUrl, 'utf8')),
  writeRsvpConfig: async (value) => writeFile(rsvpConfigUrl, `${JSON.stringify(value, null, 2)}\n`),
  ensureLogin,
  ensureD1Binding,
  uploadSecrets,
  verifyDeployment,
  randomSecret: () => randomBytes(48).toString('base64url'),
  log: console.log,
})
```

`readHidden()` 只在交互式终端运行，输入过程中仅显示星号，并在完成、退格或 Ctrl-C 路径恢复终端模式。Secret 临时文件权限为 `0600`，且始终在 `finally` 中删除；不得把管理员密码写入仓库或普通日志。

- [ ] **Step 5: 添加 Pages 与 npm 配置**

创建不含账户专属数据库 ID 的 `wrangler.jsonc`：

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "stardew-wedding-template",
  "compatibility_date": "2026-08-01",
  "pages_build_output_dir": "./dist"
}
```

在 `package.json` 中加入：

```json
{
  "scripts": {
    "test": "node --test",
    "dev:cloudflare": "npm run build && wrangler pages dev dist",
    "setup:rsvp": "node scripts/setup-rsvp.js",
    "deploy": "npm test && npm run build && wrangler pages deploy dist"
  },
  "devDependencies": {
    "vite": "^7.1.1",
    "wrangler": "^4.123.0"
  }
}
```

运行 `npm install` 更新 lockfile。

- [ ] **Step 6: 运行 setup 单元测试**

Run: `node --test tests/setup-rsvp.test.js`

Expected: 3 tests passed；首次执行顺序正确；部署失败恢复 `enabled: false`；健康检查失败会重新部署关闭状态。

- [ ] **Step 7: 提交 setup 向导**

```bash
git add scripts tests/setup-rsvp.test.js wrangler.jsonc package.json package-lock.json
git commit -m "feat(rsvp): 添加 Cloudflare 一键配置向导"
```

### Task 6: 编写 README 完整流程并锁定文档结构

**Files:**
- Modify: `README.md`
- Create: `tests/readme-rsvp.test.js`

- [ ] **Step 1: 写入 README 验收测试**

创建 `tests/readme-rsvp.test.js`：

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')

test('documents the complete optional RSVP lifecycle', () => {
  const required = [
    '## 可选功能：宾客登记（默认关闭）',
    '### 开启前准备',
    'npm run setup:rsvp',
    '### 启用后验证',
    '### 日常更新部署',
    '### 关闭 RSVP',
    '### 彻底清理 RSVP 数据',
    '### 故障排查',
    '### 隐私与安全',
  ]
  for (const text of required) assert.ok(readme.includes(text), `README missing: ${text}`)
})

test('warns that disabling the UI does not delete guest data', () => {
  assert.match(readme, /关闭页面入口不会删除 D1 中的宾客数据/)
  assert.match(readme, /删除数据库后无法恢复/)
})
```

- [ ] **Step 2: 运行测试并确认 README 内容缺失**

Run: `node --test tests/readme-rsvp.test.js`

Expected: FAIL with `README missing: ## 可选功能：宾客登记（默认关闭）`。

- [ ] **Step 3: 编写 README 的 RSVP 章节**

按以下固定结构写入 `README.md`；每个命令下面紧跟用途、预期输出和需要替换的值来源：

```markdown
## 可选功能：宾客登记（默认关闭）

不需要收集宾客信息时无需执行本节命令。默认构建不会显示表单或管理入口，也不需要 Cloudflare D1 和 Secret。

### 开启前准备

- Node.js 20 或更高版本
- 可登录的 Cloudflare 账号
- 准备一个至少 12 个字符的管理员密码
- 了解 D1、Pages Functions 和 Secret 可能产生的 Cloudflare 用量

### 一条命令开启

```bash
npm install
npm run setup:rsvp
```

向导会登录 Cloudflare、创建或选择 Pages 项目、创建并绑定 D1、执行迁移、生成会话密钥、保存管理员密码、开启前端入口、测试、构建并部署。向导不会把密码或会话密钥提交到 Git。

### 启用后验证

1. 打开向导输出的邀请函地址，提交一条名为“测试宾客”的登记。
2. 打开同一域名下的 `/admin/`，使用配置时输入的管理员密码登录。
3. 确认列表出现测试宾客，再删除或保留该测试数据。

### 日常更新部署

使用向导创建的 Wrangler 部署项目时运行：

```bash
npm run deploy
```

不要再为同一项目创建第二个 Pages 项目。若原项目使用 Git 集成，先确认 `wrangler.jsonc` 与控制台绑定一致，再选择一种部署方式长期使用。

### 关闭 RSVP

把 `config/rsvp.json` 中的 `enabled` 改为 `false` 后重新部署。关闭页面入口不会删除 D1 中的宾客数据，也不会删除 Cloudflare Secret。

### 彻底清理 RSVP 数据

先从 `/admin/` 导出 CSV 并妥善保存，再到 Cloudflare 控制台删除对应 D1 数据库和 Pages Secret。删除数据库后无法恢复。

### 故障排查

- 登录失败：重新运行 `npx wrangler login`。
- 缺少 DB：检查 `wrangler.jsonc` 中绑定名是否严格为 `DB`，然后重新部署。
- 表不存在：运行 `npx wrangler d1 migrations apply DB --remote`。
- 管理后台未配置：重新运行 `npm run setup:rsvp` 更新两个 Secret。
- 部署后仍隐藏：确认 `config/rsvp.json` 的 `enabled` 为 `true`，并确认部署的是最新提交。
- 管理员密码无效：重新运行向导并输入新的至少 12 字符密码。

### 隐私与安全

仅收集婚礼筹备真正需要的信息。电话和留言只用于本次婚礼；CSV 不应上传到公开仓库或发送到无关群聊。管理员密码使用独立强密码，婚礼结束后及时导出并删除数据。
```

- [ ] **Step 4: 运行 README 测试**

Run: `node --test tests/readme-rsvp.test.js`

Expected: 2 tests passed。

- [ ] **Step 5: 提交完整文档**

```bash
git add README.md tests/readme-rsvp.test.js
git commit -m "docs(rsvp): 添加完整启用与清理指南"
```

### Task 7: 全面验证默认关闭与可选启用构建

**Files:**
- Verify: all files above

- [ ] **Step 1: 验证默认配置**

Run: `node -e "const c=require('./config/rsvp.json'); if(c.enabled) process.exit(1)" && npm test && npm run build`

Expected: config remains disabled；all tests pass；Vite build exits 0。

- [ ] **Step 2: 检查默认构建的页面入口**

Run: `rg -n "data-rsvp-ui hidden|data-rsvp-shortcut hidden|RSVP 默认关闭" dist/index.html dist/admin/index.html`

Expected: 邀请函两个入口均带 `hidden`；管理后台包含关闭说明。

- [ ] **Step 3: 临时验证启用构建**

使用 `apply_patch` 暂时将 `config/rsvp.json` 的 `enabled` 改为 `true`，然后运行：

```bash
npm test
npm run build
rg -n "rsvp-client" dist/assets/*.js
```

Expected: all tests pass；build exits 0；构建产物包含 RSVP 动态模块。

- [ ] **Step 4: 恢复默认关闭并重新构建**

使用 `apply_patch` 把 `enabled` 恢复为 `false`，然后运行：

```bash
npm test
npm run build
git diff --check
git status --short
```

Expected: all tests pass；build exits 0；无空白错误；只包含本任务尚未提交的验证性修改时才允许继续。

- [ ] **Step 5: 本地 Cloudflare 冒烟测试**

Run: `npm run dev:cloudflare`

在另一个终端检查：

```bash
curl -fsS http://localhost:8788/ | rg "婚礼邀请函"
curl -fsS http://localhost:8788/admin/ | rg "RSVP 默认关闭"
```

Expected: 两个请求均为 HTTP 200；默认页面可用；后台显示关闭说明。随后用 `Ctrl-C` 停止本地服务。

- [ ] **Step 6: 检查仓库状态**

Run: `git status --short && git log -7 --oneline`

Expected: 工作树干净；历史包含默认开关、API、客户端、后台、setup 和 README 的独立提交。
