import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { expectNoA11yViolations } from './axe.ts'
import {
  closeResult,
  fixAnswers,
  fixAnswersWith,
  guess,
  resultDialog,
  selectLength,
  turnOnWordubado,
  waitForReady,
  waitForResult,
} from './helpers.ts'

type Mode = 'ok' | 'long' | 'notfound' | 'malformed' | 'abort' | 'hang'
type Stub = { count: number; mode: Mode }

const CORS = { 'access-control-allow-origin': '*' }

async function stubDictionary(page: Page, mode: Mode): Promise<Stub> {
  const stub: Stub = { count: 0, mode }
  await page.route('https://api.dictionaryapi.dev/**', async (route) => {
    stub.count += 1
    switch (stub.mode) {
      case 'ok':
        return route.fulfill({
          status: 200,
          headers: CORS,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              word: 'crane',
              meanings: [
                {
                  partOfSpeech: 'noun',
                  definitions: [
                    {
                      definition:
                        'A large, tall bird with long legs and a long neck.',
                    },
                  ],
                },
                {
                  partOfSpeech: 'verb',
                  definitions: [
                    {
                      definition:
                        "Stretch out one's body or neck to see something.",
                    },
                  ],
                },
              ],
            },
          ]),
        })
      case 'long':
        return route.fulfill({
          status: 200,
          headers: CORS,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              word: 'crane',
              meanings: [
                {
                  partOfSpeech: 'noun',
                  definitions: [{ definition: 'lengthy words '.repeat(11) }],
                },
              ],
            },
          ]),
        })
      case 'notfound':
        return route.fulfill({
          status: 404,
          headers: CORS,
          contentType: 'application/json',
          body: JSON.stringify({ title: 'No Definitions Found' }),
        })
      case 'malformed':
        return route.fulfill({
          status: 200,
          headers: CORS,
          contentType: 'application/json',
          body: JSON.stringify({ nope: 1 }),
        })
      case 'abort':
        return route.abort('failed')
      case 'hang':
        await new Promise((r) => setTimeout(r, 7000))
        try {
          await route.fulfill({ status: 200, headers: CORS, body: '[]' })
        } catch {
          // page already gone or request aborted
        }
        return
    }
  })
  return stub
}

test.use({ reducedMotion: 'reduce' })

test.beforeEach(async ({ page }) => {
  await fixAnswers(page)
})

async function finish(page: Page) {
  await page.goto('/')
  await waitForReady(page)
  await guess(page, 'house', 1)
  await guess(page, 'crane', 2)
  await waitForResult(page)
}

const region = (page: Page) =>
  resultDialog(page).getByRole('region', { name: 'Definition' })
const showBtn = (page: Page) =>
  resultDialog(page).getByRole('button', { name: 'Show definition' })

test('hidden until clicked, no prefetch (D-07)', async ({ page }) => {
  const stub = await stubDictionary(page, 'ok')
  await finish(page)
  await expect(showBtn(page)).toBeVisible()
  await expect(region(page)).toHaveCount(0)
  expect(stub.count).toBe(0)
})

test('success shows two senses and the credit (D-09)', async ({ page }) => {
  const stub = await stubDictionary(page, 'ok')
  await finish(page)
  await showBtn(page).click()
  await expect(showBtn(page)).toHaveCount(0)
  const r = region(page)
  await expect(r).toContainText('noun')
  await expect(r).toContainText(
    'A large, tall bird with long legs and a long neck.',
  )
  await expect(r).toContainText('verb')
  await expect(r).toContainText('Source: dictionaryapi.dev')
  await expect(r).toBeFocused()
  expect(stub.count).toBe(1)
})

test('long senses are cut at 100 characters', async ({ page }) => {
  await stubDictionary(page, 'long')
  await finish(page)
  await showBtn(page).click()
  const dd = region(page).locator('dd').first()
  await expect(dd).toContainText('…')
  const text = (await dd.textContent()) ?? ''
  expect(text.length).toBeLessThanOrEqual(101)
  expect(text.endsWith('…')).toBe(true)
})

test('404 shows Definition unavailable and Try again retries (D-10)', async ({
  page,
}) => {
  const stub = await stubDictionary(page, 'notfound')
  await finish(page)
  await showBtn(page).click()
  await expect(region(page)).toContainText('Definition unavailable')
  const retry = region(page).getByRole('button', { name: 'Try again' })
  await expect(retry).toBeVisible()
  stub.mode = 'ok'
  await retry.click()
  await expect(region(page)).toContainText(
    'A large, tall bird with long legs and a long neck.',
  )
  await expect(region(page)).toBeFocused()
  expect(stub.count).toBe(2)
})

for (const mode of ['malformed', 'abort'] as const) {
  test(`${mode} response is unavailable`, async ({ page }) => {
    await stubDictionary(page, mode)
    await finish(page)
    await showBtn(page).click()
    await expect(region(page)).toContainText('Definition unavailable')
  })
}

test('timeout after 5 s (D-10)', async ({ page }) => {
  test.setTimeout(30000)
  await stubDictionary(page, 'hang')
  await finish(page)
  await showBtn(page).click()
  await expect(region(page)).toContainText('Looking it up...')
  await expect(region(page)).toHaveAttribute('aria-busy', 'true')
  await expect(region(page)).toContainText('Definition unavailable', {
    timeout: 7000,
  })
})

test('stays revealed on reopen with no second request (D-24)', async ({
  page,
}) => {
  const stub = await stubDictionary(page, 'ok')
  await finish(page)
  await showBtn(page).click()
  await expect(region(page)).toContainText('noun')
  await closeResult(page)
  await page.getByRole('button', { name: 'See result' }).click()
  await waitForResult(page)
  await expect(region(page)).toContainText('noun')
  expect(stub.count).toBe(1)
  await expect(
    resultDialog(page).getByRole('button', { name: 'Play again' }),
  ).toBeFocused()
})

test('failed lookups retry on reopen (D-26)', async ({ page }) => {
  const stub = await stubDictionary(page, 'notfound')
  await finish(page)
  await showBtn(page).click()
  await expect(region(page)).toContainText('Definition unavailable')
  await closeResult(page)
  stub.mode = 'ok'
  await page.getByRole('button', { name: 'See result' }).click()
  await waitForResult(page)
  await expect(region(page)).toContainText('noun')
  expect(stub.count).toBe(2)
})

test('Play again, reload and Board switch hide it (D-25)', async ({ page }) => {
  await stubDictionary(page, 'ok')
  await finish(page)
  await showBtn(page).click()
  await expect(region(page)).toContainText('noun')
  await resultDialog(page).getByRole('button', { name: 'Play again' }).click()
  await expect(resultDialog(page)).toBeHidden()
  await waitForReady(page)
  await guess(page, 'crane', 1)
  await waitForResult(page)
  await expect(showBtn(page)).toBeVisible()

  await showBtn(page).click()
  await expect(region(page)).toContainText('noun')
  await closeResult(page)
  await page.reload()
  await page.getByRole('button', { name: 'See result' }).click()
  await waitForResult(page)
  await expect(showBtn(page)).toBeVisible()

  await closeResult(page)
  await selectLength(page, 4)
  await page.getByRole('radio', { name: '5 letters' }).click()
  await expect(page.locator('.banner')).toBeVisible()
  await page.getByRole('button', { name: 'See result' }).click()
  await waitForResult(page)
  await expect(showBtn(page)).toBeVisible()

  const saved = await page.evaluate(() =>
    localStorage.getItem('unlimited-wordle'),
  )
  expect(saved).not.toContain('definitionShown')
})

test('axe with the panel in each state', async ({ page }) => {
  test.setTimeout(30000)
  const stub = await stubDictionary(page, 'hang')
  await finish(page)
  await showBtn(page).click()
  await expect(region(page)).toContainText('Looking it up...')
  await expectNoA11yViolations(page, 'dialog[open]')
  stub.mode = 'ok'
  await closeResult(page)
  await page.getByRole('button', { name: 'See result' }).click()
  await waitForResult(page)
  await expect(region(page)).toContainText('noun')
  await expectNoA11yViolations(page, 'dialog[open]')
  await closeResult(page)
  stub.mode = 'notfound'
  // success is cached, so use a fresh Board for the unavailable state
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await waitForReady(page)
  await guess(page, 'crane', 1)
  await waitForResult(page)
  await showBtn(page).click()
  await expect(region(page)).toContainText('Definition unavailable')
  await expectNoA11yViolations(page, 'dialog[open]')
})

test('320x500 fits', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 500 })
  await stubDictionary(page, 'ok')
  await finish(page)
  await showBtn(page).click()
  await expect(region(page)).toContainText('noun')
  const fits = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight <= window.innerHeight,
    w: document.documentElement.scrollWidth <= window.innerWidth,
  }))
  expect(fits).toEqual({ h: true, w: true })
  const again = resultDialog(page).getByRole('button', { name: 'Play again' })
  await again.scrollIntoViewIfNeeded()
  await expect(again).toBeInViewport()
})

type SlangEntry = {
  word: string
  definition: string
  crude: boolean
  reviewed: boolean
}
const slangEntries = JSON.parse(
  readFileSync(new URL('../scripts/words/slang.json', import.meta.url), 'utf8'),
) as SlangEntry[]

async function revealWubado(page: Page, word: string) {
  const n = word.length as 4 | 5 | 6
  await fixAnswersWith(page, { [n]: word })
  await page.goto('/')
  await waitForReady(page)
  await turnOnWordubado(page)
  if (n !== 5) await selectLength(page, n)
  await guess(page, word, 1)
  await waitForResult(page)
  await showBtn(page).click()
}

test.describe('Curated slang definitions (D-08, D-11)', () => {
  test('Wordubado slang answer shows the curated meaning with no request', async ({
    page,
  }) => {
    const stub = await stubDictionary(page, 'ok')
    await revealWubado(page, 'aight')
    const r = region(page)
    await expect(r).toContainText('A casual way of saying all right.')
    await expect(r).not.toContainText('Source: dictionaryapi.dev')
    await expect(r).not.toContainText('noun')
    expect(stub.count).toBe(0)
  })

  test('a crude entry displays the same way (D-11)', async ({ page }) => {
    const stub = await stubDictionary(page, 'ok')
    const entry = slangEntries.find((e) => e.crude && e.reviewed)!
    await revealWubado(page, entry.word)
    const r = region(page)
    await expect(r).toContainText(entry.definition)
    expect(((await r.textContent()) ?? '').trim()).toBe(entry.definition)
    expect(stub.count).toBe(0)
  })

  test('Wordubado common answer uses the dictionary', async ({ page }) => {
    const stub = await stubDictionary(page, 'ok')
    await page.goto('/')
    await waitForReady(page)
    await turnOnWordubado(page)
    await guess(page, 'crane', 1)
    await waitForResult(page)
    await showBtn(page).click()
    await expect(region(page)).toContainText('noun')
    await expect(region(page)).toContainText('Source: dictionaryapi.dev')
    expect(stub.count).toBe(1)
  })

  test('Normal answers never use curated text', async ({ page }) => {
    const stub = await stubDictionary(page, 'ok')
    await finish(page)
    await showBtn(page).click()
    await expect(region(page)).toContainText('noun')
    expect(stub.count).toBe(1)
  })

  test('curated text stays revealed on reopen', async ({ page }) => {
    const stub = await stubDictionary(page, 'ok')
    await revealWubado(page, 'aight')
    await expect(region(page)).toContainText(
      'A casual way of saying all right.',
    )
    await closeResult(page)
    await page.getByRole('button', { name: 'See result' }).click()
    await waitForResult(page)
    await expect(region(page)).toContainText(
      'A casual way of saying all right.',
    )
    expect(stub.count).toBe(0)
  })
})
