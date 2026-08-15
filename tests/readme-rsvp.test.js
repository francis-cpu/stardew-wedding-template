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

test('documents ignored local RSVP deployment state', () => {
  for (const required of [
    '.env.rsvp.local',
    'wrangler.rsvp.jsonc',
    'npm run deploy',
    'Git 自动部署',
  ]) {
    assert.match(readme, new RegExp(required.replaceAll('.', '\\.')))
  }
  assert.match(readme, /删除 `.env\.rsvp\.local`/)
  assert.match(readme, /不会提交到 Git/)
})

test('documents the six-character administrator password minimum', () => {
  assert.match(readme, /至少 6 个字符的独立管理员密码/)
  assert.doesNotMatch(readme, /至少 12 个字符的独立管理员密码/)
})
