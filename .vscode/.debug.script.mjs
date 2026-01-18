import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'

const pkg = createRequire(import.meta.url)('../package.json')
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

// write .debug.env
const envContent = Object.entries(pkg.debug.env).map(([key, val]) => `${key}=${val}`)
fs.writeFileSync(path.join(__dirname, '.debug.env'), envContent.join('\n'))

// bootstrap
const vite = spawn(
  // TODO: terminate `npm run dev` when Debug exits.
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'dev'],
  {
    cwd: root,
    stdio: 'inherit',
    env: Object.assign(process.env, { VSCODE_DEBUG: 'true' }),
    shell: true,
  },
)

vite.on('error', (error) => {
  console.error('[vite] Failed to start dev server:', error)
  process.exit(1)
})

vite.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[vite] Dev server exited with code ${code}`)
    process.exit(code)
  }
})

// Keep the process alive
process.on('SIGINT', () => {
  vite.kill('SIGINT')
  process.exit(0)
})

process.on('SIGTERM', () => {
  vite.kill('SIGTERM')
  process.exit(0)
})
