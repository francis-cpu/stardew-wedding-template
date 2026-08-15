# RSVP 成功态稳定切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 提交 RSVP 后稳定显示居中的成功卡片，不让后续页面区块因表单隐藏而突然上移。

**Architecture:** `rsvp-client.js` 将成功态进入和退出提取为可测试 DOM 协调函数。进入时先锁定 RSVP 区域当前高度，再切换表单和成功卡片；CSS 状态类负责垂直居中。退出时恢复完整表单后移除锁定高度。

**Tech Stack:** 原生 JavaScript、原生 CSS、Node.js `node:test`、Vite

---

## 文件结构

- Modify: `rsvp-client.js` — 导出成功态进入与退出函数，并让提交/编辑事件使用它们。
- Modify: `index.html` — 为成功卡片提供程序聚焦所需的 `tabindex`。
- Modify: `style.css` — 为 `.rsvp.is-complete` 添加保留区域内居中布局。
- Create: `tests/rsvp-success-transition.test.js` — 用可控 DOM 替身回归测试高度锁定和状态清理。

### Task 1: 锁定成功态切换前的布局高度

**Files:**
- Create: `tests/rsvp-success-transition.test.js`
- Modify: `rsvp-client.js`

- [ ] **Step 1: 写入高度锁定的失败测试**

创建 `tests/rsvp-success-transition.test.js`：

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { enterRsvpSuccessState } from '../rsvp-client.js'

function classList() {
  const values = new Set()
  return { add: (value) => values.add(value), remove: (value) => values.delete(value), contains: (value) => values.has(value) }
}

test('locks the RSVP height before hiding the submitted form', () => {
  const form = { hidden: false }
  const section = {
    style: {},
    classList: classList(),
    getBoundingClientRect: () => ({ height: form.hidden ? 525 : 1032 }),
  }
  const success = { hidden: true, classList: classList(), focusOptions: undefined, focus(options) { this.focusOptions = options } }

  enterRsvpSuccessState({ section, form, success })

  assert.equal(section.style.minHeight, '1032px')
  assert.equal(section.classList.contains('is-complete'), true)
  assert.equal(form.hidden, true)
  assert.equal(success.hidden, false)
  assert.equal(success.classList.contains('is-visible'), true)
  assert.deepEqual(success.focusOptions, { preventScroll: true })
})
```

- [ ] **Step 2: 确认测试因缺少导出而失败**

Run: `node --test tests/rsvp-success-transition.test.js`

Expected: FAIL with `does not provide an export named 'enterRsvpSuccessState'`.

- [ ] **Step 3: 实现成功态进入函数**

在 `rsvp-client.js` 的 `initializeRsvp` 之前加入：

```js
export function enterRsvpSuccessState({ section, form, success }) {
  section.style.minHeight = `${Math.ceil(section.getBoundingClientRect().height)}px`
  section.classList.add('is-complete')
  form.hidden = true
  success.hidden = false
  success.classList.add('is-visible')
  success.focus({ preventScroll: true })
}
```

在 `showRsvpSuccess(rsvp)` 中调用：

```js
enterRsvpSuccessState({
  section: document.querySelector('#rsvp'),
  form: rsvpForm,
  success: rsvpSuccess,
})
```

以替换直接设置 `rsvpForm.hidden` 和 `rsvpSuccess.hidden` 的两行。

- [ ] **Step 4: 运行高度锁定测试**

Run: `node --test tests/rsvp-success-transition.test.js`

Expected: 1 test passed.

- [ ] **Step 5: 提交布局锁定逻辑**

```bash
git add rsvp-client.js tests/rsvp-success-transition.test.js
git commit -m "fix(rsvp): 锁定成功态切换前的布局高度"
```

### Task 2: 恢复编辑状态并完成居中样式

**Files:**
- Modify: `tests/rsvp-success-transition.test.js`
- Modify: `rsvp-client.js`
- Modify: `index.html`
- Modify: `style.css`

- [ ] **Step 1: 写入退出成功态的失败测试**

在 `tests/rsvp-success-transition.test.js` 追加：

```js
import { exitRsvpSuccessState } from '../rsvp-client.js'

test('restores the form and releases the locked RSVP height for editing', () => {
  const section = { style: { minHeight: '1032px' }, classList: classList() }
  section.classList.add('is-complete')
  const form = { hidden: true }
  const success = { hidden: false }

  exitRsvpSuccessState({ section, form, success })

  assert.equal(form.hidden, false)
  assert.equal(success.hidden, true)
  assert.equal(section.classList.contains('is-complete'), false)
  assert.equal(section.style.minHeight, '')
})
```

- [ ] **Step 2: 确认退出测试因缺少导出而失败**

Run: `node --test tests/rsvp-success-transition.test.js`

Expected: FAIL with `does not provide an export named 'exitRsvpSuccessState'`.

- [ ] **Step 3: 实现退出函数、可聚焦卡片和居中样式**

在 `rsvp-client.js` 的进入函数之后加入：

```js
export function exitRsvpSuccessState({ section, form, success }) {
  form.hidden = false
  success.hidden = true
  section.classList.remove('is-complete')
  section.style.minHeight = ''
}
```

在 `#rsvp-edit` 的点击监听器中调用：

```js
exitRsvpSuccessState({
  section: document.querySelector('#rsvp'),
  form: rsvpForm,
  success: rsvpSuccess,
})
```

在 `index.html` 中把成功卡片开始标签改为：

```html
<article class="rsvp-success reveal" id="rsvp-success" aria-live="polite" tabindex="-1" hidden>
```

在 `style.css` 的 RSVP 样式区加入：

```css
.rsvp.is-complete { display: grid; align-content: center; }
.rsvp.is-complete .rsvp-card { display: none; }
```

- [ ] **Step 4: 运行成功态回归测试和构建**

Run: `node --test tests/rsvp-success-transition.test.js && npm run build`

Expected: 2 tests passed; Vite build exits 0.

- [ ] **Step 5: 提交成功态完整修复**

```bash
git add rsvp-client.js index.html style.css tests/rsvp-success-transition.test.js
git commit -m "fix(rsvp): 稳定显示提交成功状态"
```

### Task 3: 以手机视口验证真实提交流程

**Files:**
- Verify: all files above

- [ ] **Step 1: 启动暂时开启 RSVP 的本地预览**

用 `apply_patch` 暂时把 `config/rsvp.json` 的 `enabled` 改为 `true`，运行 `npm run dev -- --port 4173`，在 390×844 Playwright 视口拦截 `/api/rsvp` 并返回 201 成功响应。

- [ ] **Step 2: 检查提交前后的布局**

填写姓名、选择“无需住宿”、提交。读取 `.rsvp` 的 `getBoundingClientRect().height` 和后续绿色区块的文档位置。

Expected: RSVP 高度与绿色区块位置在提交前后保持不变；`.rsvp-success` 可见并带有 `is-visible`。

- [ ] **Step 3: 恢复默认关闭并运行最终验证**

用 `apply_patch` 把 `enabled` 恢复为 `false`，停止本地预览，然后运行：

```bash
npm test
npm run build
git diff --check
git status --short
```

Expected: all tests pass; build exits 0; default config remains disabled; worktree is clean after commit.

