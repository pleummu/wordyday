import { readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const html = readFileSync('index.html', 'utf8')
const DESC =
  'Endless Wordle in 4, 5 and 6 letters. Play as many games as you like, in Normal or Wordubado.'

const meta = (attr, key) => {
  const m = html.match(
    new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`),
  )
  return m?.[1]
}

const pngSize = (path) => {
  const b = readFileSync(path)
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

describe('index.html head', () => {
  it('has title and description', () => {
    expect(html).toContain('<title>Unlimited Wordle</title>')
    expect(meta('name', 'description')).toBe(DESC)
  })

  it('has Open Graph tags', () => {
    expect(meta('property', 'og:title')).toBe('Unlimited Wordle')
    expect(meta('property', 'og:type')).toBe('website')
    expect(meta('property', 'og:url')).toBe('https://wordyday.vercel.app/')
    expect(meta('property', 'og:image')).toBe(
      'https://wordyday.vercel.app/og-image.png',
    )
    expect(meta('property', 'og:image:width')).toBe('1200')
    expect(meta('property', 'og:image:height')).toBe('630')
    expect(meta('property', 'og:image:alt')).toBeTruthy()
    expect(meta('property', 'og:description')).toBe(DESC)
  })

  it('has twitter card', () => {
    expect(meta('name', 'twitter:card')).toBe('summary_large_image')
  })

  it('links icons', () => {
    expect(html).toMatch(
      /<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="\/favicon\.svg"/,
    )
    expect(html).toMatch(
      /<link\s+rel="apple-touch-icon"\s+href="\/apple-touch-icon\.png"/,
    )
  })

  it('has noscript message', () => {
    expect(html).toMatch(
      /<noscript>[\s\S]*Unlimited Wordle needs JavaScript to play\. Please turn it on and reload\.[\s\S]*<\/noscript>/,
    )
  })
})

describe('assets', () => {
  it('og-image is 1200x630 and small', () => {
    expect(pngSize('public/og-image.png')).toEqual({ w: 1200, h: 630 })
    expect(statSync('public/og-image.png').size).toBeLessThan(300 * 1024)
  })

  it('apple-touch-icon is 180x180', () => {
    expect(pngSize('public/apple-touch-icon.png')).toEqual({ w: 180, h: 180 })
  })

  it('favicon is a sage tile with a W', () => {
    const svg = readFileSync('public/favicon.svg', 'utf8')
    expect(svg).toContain('#a9c4b0')
    expect(svg).toMatch(/<text[^>]*>\s*W\s*<\/text>/)
  })
})
