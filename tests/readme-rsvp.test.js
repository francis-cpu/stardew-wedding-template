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
