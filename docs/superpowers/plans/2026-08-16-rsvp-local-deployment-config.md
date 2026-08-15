# RSVP Local Deployment Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user explicitly prohibited automatic commits and pushes; leave every implementation change uncommitted.

**Goal:** Keep the public template RSVP-disabled and account-neutral while allowing this machine to deploy the configured RSVP-enabled site with `npm run deploy`.

**Architecture:** A shared browser-side module combines the committed disabled default with a Vite `rsvp` mode override. Two ignored local files hold the enable marker and account-specific Wrangler/D1 configuration. A deployment selector chooses the base or local build/config pair, and the setup wizard writes only local state.

**Tech Stack:** Node.js 22, Vite 7, Wrangler 4, Node test runner, Cloudflare Pages Functions and D1.

---

### Task 1: Make the effective RSVP switch build-specific

**Files:**
- Create: `rsvp-config.js`
- Modify: `app.js`
- Modify: `admin/admin.js`
- Modify: `config/rsvp.json`
- Test: `tests/rsvp-feature-flag.test.js`
- Test: `tests/admin-feature-flag.test.js`

- [ ] **Step 1: Write failing tests for the committed default and shared effective config**

Update the feature tests to require `config/rsvp.json.enabled === false`, require both entry points to import the shared module, and test the pure resolver:

```js
import { resolveRsvpConfig } from '../rsvp-config.js'

test('keeps RSVP disabled unless the build override is explicitly true', () => {
  const base = { enabled: false, apiUrl: '/api/rsvp' }
  assert.equal(resolveRsvpConfig(base, undefined).enabled, false)
  assert.equal(resolveRsvpConfig(base, 'false').enabled, false)
  assert.equal(resolveRsvpConfig(base, 'true').enabled, true)
})
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/rsvp-feature-flag.test.js tests/admin-feature-flag.test.js`

Expected: FAIL because `rsvp-config.js` does not exist and the tracked config is currently enabled.

- [ ] **Step 3: Implement the shared resolver and restore the committed default**

Create `rsvp-config.js`:

```js
import baseConfig from './config/rsvp.json' with { type: 'json' }

export function resolveRsvpConfig(config, override) {
  return { ...config, enabled: config.enabled || override === 'true' }
}

export default resolveRsvpConfig(baseConfig, import.meta.env?.VITE_RSVP_ENABLED)
```

Change `app.js` to import `rsvpConfig` from `./rsvp-config.js`, change `admin/admin.js` to import it from `../rsvp-config.js`, and restore `config/rsvp.json` to:

```json
{
  "enabled": false,
  "apiUrl": "/api/rsvp"
}
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `node --test tests/rsvp-feature-flag.test.js tests/admin-feature-flag.test.js`

Expected: all feature-flag tests pass.

- [ ] **Step 5: Review the uncommitted checkpoint**

Run: `git diff -- app.js admin/admin.js rsvp-config.js config/rsvp.json tests/rsvp-feature-flag.test.js tests/admin-feature-flag.test.js`

Expected: only the shared effective-switch changes are present; do not commit.

### Task 2: Add a deterministic local-aware deployment selector

**Files:**
- Create: `scripts/lib/deploy-rsvp.js`
- Create: `scripts/deploy.js`
- Modify: `package.json`
- Modify: `.gitignore`
- Test: `tests/deploy-rsvp.test.js`

- [ ] **Step 1: Write failing selector tests**

Create tests for these exact states:

```js
assert.deepEqual(createDeploymentPlan({ hasLocalWrangler: false, hasEnableMarker: false }), {
  buildArgs: ['run', 'build'],
  deployArgs: ['pages', 'deploy', 'dist'],
  useLocalWrangler: false,
})

assert.deepEqual(createDeploymentPlan({ hasLocalWrangler: true, hasEnableMarker: true }), {
  buildArgs: ['run', 'build', '--', '--mode', 'rsvp'],
  deployArgs: ['pages', 'deploy', 'dist'],
  useLocalWrangler: true,
})

assert.throws(
  () => createDeploymentPlan({ hasLocalWrangler: false, hasEnableMarker: true }),
  /本地 RSVP 配置不完整/,
)
```

Also verify that a local Wrangler file with no enable marker still uses `rsvp` mode and the local binding so an intentional disabled deployment preserves D1.

- [ ] **Step 2: Run the selector test and verify RED**

Run: `node --test tests/deploy-rsvp.test.js`

Expected: FAIL because the deployment selector does not exist.

- [ ] **Step 3: Implement the selector and executable deployment wrapper**

Implement `createDeploymentPlan` as a pure function. Implement `deploy()` to run `npm test`, the selected Vite build, and the selected `wrangler pages deploy` command. Because Pages rejects custom `--config` paths, local deployment must temporarily copy `wrangler.rsvp.jsonc` over the root `wrangler.jsonc`, call Pages without `--config`, and restore the tracked default in `finally`. `scripts/deploy.js` should detect `.env.rsvp.local` and `wrangler.rsvp.jsonc` with `fs.access`, then execute the plan through `runCommand`.

Change package scripts to:

```json
"deploy": "node scripts/deploy.js"
```

Add these ignore entries:

```gitignore
.env.rsvp.local
wrangler.rsvp.jsonc
```

- [ ] **Step 4: Run the selector test and verify GREEN**

Run: `node --test tests/deploy-rsvp.test.js`

Expected: all deployment selector tests pass.

- [ ] **Step 5: Review the uncommitted checkpoint**

Run: `git diff -- package.json .gitignore scripts/deploy.js scripts/lib/deploy-rsvp.js tests/deploy-rsvp.test.js`

Expected: deployment selection is isolated from Cloudflare resource provisioning; do not commit.

### Task 3: Make the setup wizard write only ignored local state

**Files:**
- Modify: `scripts/lib/setup-rsvp.js`
- Modify: `scripts/setup-rsvp.js`
- Modify: `tests/setup-rsvp.test.js`
- Modify: `tests/cloudflare-config.test.js`

- [ ] **Step 1: Replace tracked-config expectations with local-state expectations**

Update the setup harness to expose `enableLocalRsvp`, `restoreLocalRsvp`, and `deploy`. Require successful setup to call `enableLocalRsvp` before `deploy`, while the in-memory committed config remains `{ enabled: false, apiUrl: '/api/rsvp' }`. Require failures to restore the previous local marker.

Add assertions that D1 migration uses:

```js
['d1', 'migrations', 'apply', 'DB', '--remote', '--config', 'wrangler.rsvp.jsonc']
```

- [ ] **Step 2: Run setup tests and verify RED**

Run: `node --test tests/setup-rsvp.test.js tests/cloudflare-config.test.js`

Expected: FAIL because setup still edits `config/rsvp.json` and deploys directly with the tracked Wrangler config.

- [ ] **Step 3: Implement local-state provisioning**

In `scripts/setup-rsvp.js`:

- Read the base `wrangler.jsonc` but write project/D1 results to `wrangler.rsvp.jsonc`.
- Pass `--config wrangler.rsvp.jsonc` to D1 creation and migration.
- Write `.env.rsvp.local` as `VITE_RSVP_ENABLED=true\n` only after D1 and Secrets succeed.
- Invoke the shared deployment wrapper instead of assembling build/deploy commands inside setup.

In `scripts/lib/setup-rsvp.js`, replace tracked RSVP config mutation with local marker enable/restore dependencies. Keep the existing `8000002` project-reuse handling and deployment verification.

- [ ] **Step 4: Run setup tests and verify GREEN**

Run: `node --test tests/setup-rsvp.test.js tests/cloudflare-config.test.js`

Expected: all setup and Cloudflare configuration tests pass.

- [ ] **Step 5: Review the uncommitted checkpoint**

Run: `git diff -- scripts/setup-rsvp.js scripts/lib/setup-rsvp.js tests/setup-rsvp.test.js tests/cloudflare-config.test.js`

Expected: setup no longer writes either tracked configuration file; do not commit.

### Task 4: Migrate this machine, update guidance, and verify both build modes

**Files:**
- Modify: `wrangler.jsonc`
- Create (ignored): `.env.rsvp.local`
- Create (ignored): `wrangler.rsvp.jsonc`
- Modify: `README.md`
- Modify: `tests/readme-rsvp.test.js`

- [ ] **Step 1: Write failing repository-default and documentation tests**

Require tracked `wrangler.jsonc` to contain no `d1_databases`. Require README to mention `.env.rsvp.local`, `wrangler.rsvp.jsonc`, local-only deployment, the new close flow, and that Git automatic deployment is unsupported for the local configuration.

- [ ] **Step 2: Run documentation/default tests and verify RED**

Run: `node --test tests/rsvp-feature-flag.test.js tests/readme-rsvp.test.js`

Expected: FAIL because the tracked Wrangler file still contains this account's D1 binding and README documents tracked configuration mutation.

- [ ] **Step 3: Migrate account-specific values to ignored files**

Restore tracked `wrangler.jsonc` to:

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "stardew-wedding-template",
  "compatibility_date": "2026-08-01",
  "pages_build_output_dir": "./dist"
}
```

Create ignored `wrangler.rsvp.jsonc` with the current project name and D1 binding `DB`, and create ignored `.env.rsvp.local` containing `VITE_RSVP_ENABLED=true`.

- [ ] **Step 4: Rewrite the RSVP README lifecycle**

Document that setup creates ignored local files, `npm run deploy` uses them, deleting only `.env.rsvp.local` and deploying closes the UI while preserving D1, and rerunning setup re-enables it. Replace instructions that edit tracked files or use Git automatic deployment.

- [ ] **Step 5: Run complete verification**

Run:

```bash
npm test
npm run build
npm run build -- --mode rsvp
git diff --check
git status --short
```

Expected: all tests pass; both builds succeed; tracked defaults are disabled/account-neutral; ignored local files exist and are not listed by `git status`.

- [ ] **Step 6: Stop without committing or pushing**

Present the changed-file list, verification evidence, and the fact that local private configuration is ignored. Do not run `git commit` or `git push`.
