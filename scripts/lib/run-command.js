import { spawn } from 'node:child_process'

function executableFor(command) {
  if (command === 'wrangler') return process.platform === 'win32' ? 'npx.cmd' : 'npx'
  if (command === 'npm' && process.platform === 'win32') return 'npm.cmd'
  return command
}

export function runCommand(command, args, options = {}) {
  const finalArgs = command === 'wrangler' ? ['wrangler', ...args] : args
  return new Promise((resolve, reject) => {
    const mirrorOutput = options.stdio === 'inherit'
    const stdio = mirrorOutput ? ['inherit', 'pipe', 'pipe'] : options.stdio
    const child = spawn(executableFor(command), finalArgs, { ...options, stdio, shell: false })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (chunk) => {
      stdout += chunk
      if (mirrorOutput) process.stdout.write(chunk)
    })
    child.stderr?.on('data', (chunk) => {
      stderr += chunk
      if (mirrorOutput) process.stderr.write(chunk)
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve(stdout)
      else {
        const details = [stderr, stdout].map((value) => value.trim()).filter(Boolean).join('\n')
        reject(new Error(`${command} ${args.join(' ')} 执行失败（退出码 ${code}）。${details ? `\n${details}` : ''}`))
      }
    })
  })
}
