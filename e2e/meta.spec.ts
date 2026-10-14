import { expect, test } from '@playwright/test'

test('link-preview assets are served', async ({ page }) => {
  for (const url of [
    '/og-image.png',
    '/apple-touch-icon.png',
    '/favicon.svg',
  ]) {
    const res = await page.request.get(url)
    expect(res.status(), url).toBe(200)
  }
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('shows the friendly message', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByText(
        'Unlimited Wordle needs JavaScript to play. Please turn it on and reload.',
      ),
    ).toBeVisible()
  })
})
