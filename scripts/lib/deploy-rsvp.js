import { readFile, writeFile } from 'node:fs/promises'

export async function withLocalWranglerConfig({ defaultConfigUrl, localConfigUrl }, callback) {
  const defaultConfig = await readFile(defaultConfigUrl)
  const localConfig = await readFile(localConfigUrl)
  await writeFile(defaultConfigUrl, localConfig)
  try {
    return await callback()
  } finally {
    await writeFile(defaultConfigUrl, defaultConfig)
  }
}

export function createDeploymentPlan({ hasLocalWrangler, hasEnableMarker }) {
  if (hasEnableMarker && !hasLocalWrangler) {
    throw new Error('本地 RSVP 配置不完整：缺少 wrangler.rsvp.jsonc，请重新运行 npm run setup:rsvp。')
  }
  if (!hasLocalWrangler) {
    return {
      buildArgs: ['run', 'build'],
      deployArgs: ['pages', 'deploy', 'dist'],
      useLocalWrangler: false,
    }
  }
  return {
    buildArgs: ['run', 'build', '--', '--mode', 'rsvp'],
    deployArgs: ['pages', 'deploy', 'dist'],
    useLocalWrangler: true,
  }
}

export async function deployRsvp({ hasLocalWrangler, hasEnableMarker, run, withLocalWrangler }) {
  const plan = createDeploymentPlan({ hasLocalWrangler, hasEnableMarker })
  await run('npm', ['test'], { stdio: 'inherit' })
  await run('npm', plan.buildArgs, { stdio: 'inherit' })
  const deploy = () => run('wrangler', plan.deployArgs, { stdio: 'inherit' })
  if (plan.useLocalWrangler) {
    await withLocalWrangler(deploy)
  } else {
    await deploy()
  }
}
