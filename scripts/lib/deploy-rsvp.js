export function createDeploymentPlan({ hasLocalWrangler, hasEnableMarker }) {
  if (hasEnableMarker && !hasLocalWrangler) {
    throw new Error('本地 RSVP 配置不完整：缺少 wrangler.rsvp.jsonc，请重新运行 npm run setup:rsvp。')
  }
  if (!hasLocalWrangler) {
    return {
      buildArgs: ['run', 'build'],
      deployArgs: ['pages', 'deploy', 'dist'],
    }
  }
  return {
    buildArgs: ['run', 'build', '--', '--mode', 'rsvp'],
    deployArgs: ['pages', 'deploy', 'dist', '--config', 'wrangler.rsvp.jsonc'],
  }
}

export async function deployRsvp({ hasLocalWrangler, hasEnableMarker, run }) {
  const plan = createDeploymentPlan({ hasLocalWrangler, hasEnableMarker })
  await run('npm', ['test'], { stdio: 'inherit' })
  await run('npm', plan.buildArgs, { stdio: 'inherit' })
  await run('wrangler', plan.deployArgs, { stdio: 'inherit' })
}
