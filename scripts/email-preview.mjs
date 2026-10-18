#!/usr/bin/env node
/**
 * Opens the in-app email preview in the browser.
 * Usage: npm run email:preview  (requires `npm run dev` or pass --url)
 */
import { exec } from 'node:child_process'
import { platform } from 'node:os'

const url = process.argv.find((a) => a.startsWith('--url='))?.slice(6) ??
  'http://localhost:5173/email-preview'

const cmd =
  platform() === 'win32'
    ? `start "" "${url}"`
    : platform() === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`

console.log(`Opening email preview: ${url}`)
console.log('Start the Vite dev server first if it is not already running (`npm run dev`).')
exec(cmd, (err) => {
  if (err) {
    console.error(err.message)
    process.exit(1)
  }
})
