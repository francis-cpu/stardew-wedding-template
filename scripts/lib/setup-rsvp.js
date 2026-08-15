export async function configureRsvp(input, deps) {
  const original = await deps.readRsvpConfig()
  let deployedEnabledBuild = false
  const projectName = input.projectName.trim()
  if (!/^[a-z0-9-]{1,58}$/.test(projectName)) {
    throw new Error('Pages 项目名只能包含小写字母、数字和连字符。')
  }
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
    deps.log(`RSVP 已开启：https://${projectName}.pages.dev/`)
  } catch (error) {
    await deps.writeRsvpConfig(original)
    if (deployedEnabledBuild) {
      await deps.run('npm', ['run', 'build'], { stdio: 'inherit' })
      await deps.run('wrangler', ['pages', 'deploy', 'dist', '--project-name', projectName], { stdio: 'inherit' })
    }
    throw error
  }
}
