// Run with: node scripts/make-assets.mjs
// Renders scripts/assets/*.svg to public/*.png with Playwright's cached
// Chromium. Output is committed; not part of CI.
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const jobs = [
  ['og-image', 1200, 630],
  ['apple-touch-icon', 180, 180],
]

const browser = await chromium.launch()
for (const [name, width, height] of jobs) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  })
  const svg = readFileSync(`scripts/assets/${name}.svg`, 'utf8')
  await page.setContent(`<!doctype html><body style="margin:0">${svg}</body>`)
  await page.screenshot({ path: `public/${name}.png`, omitBackground: false })
  await page.close()
}
await browser.close()
