import { expect, test, type Page } from '@playwright/test'
import { score, type TileState } from '../src/logic/score.ts'
import {
  closeResult,
  fixAnswers,
  guessAll,
  resultDialog,
  selectLength,
  turnOnWordubado,
  waitForReady,
  waitForResult,
} from './helpers.ts'

const ORIGIN = 'http://localhost:4173'
const SQUARES: Record<TileState, string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬜',
}
const WRONG6 = ['house', 'ghost', 'plant', 'mouse', 'stone', 'brick']
const FAIL_NOTE = "Couldn't copy. Select the text and copy it."

function expected(header: string, answer: string, guesses: string[]): string {
  const grid = guesses.map((g) =>
    score(answer, g)
      .map((s) => SQUARES[s])
      .join(''),
  )
  return [header, '', ...grid, '', ORIGIN].join('\n')
}

function shareButton(page: Page) {
  return resultDialog(page).getByRole('button', { name: 'Share' })
}

async function start(page: Page) {
  await page.goto('/')
  await waitForReady(page)
}

async function readClipboard(page: Page): Promise<string> {
  // Windows Chromium hands the clipboard back with CRLF line endings.
  const raw = await page.evaluate(() => navigator.clipboard.readText())
  return raw.split('\r\n').join('\n')
}

async function giveUpAfter(page: Page, words: string[]) {
  await guessAll(page, words)
  await page.getByRole('button', { name: 'Give up' }).click()
  await page
    .getByRole('dialog', { name: 'Give up?' })
    .getByRole('button', { name: 'Give up' })
    .click()
  await waitForResult(page)
}

test.use({ reducedMotion: 'reduce' })

test.beforeEach(async ({ page }) => {
  await fixAnswers(page)
})

test.describe('Share on desktop (D-17, D-28)', () => {
  test.beforeEach(async ({ context }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  })

  test('Normal win copies the grid', async ({ page }) => {
    await start(page)
    await guessAll(page, ['house', 'crane'])
    await waitForResult(page)
    const btn = shareButton(page)
    await btn.click()
    expect(await readClipboard(page)).toBe(
      'Wordle 5 - 2/6\n\n⬜⬜⬜⬜🟩\n🟩🟩🟩🟩🟩\n\nhttp://localhost:4173',
    )
    await expect(btn).toHaveText('Copied ✓')
    await expect(btn).toHaveAccessibleName('Share')
    await expect(btn).toHaveText('Share', { timeout: 3500 })
  })

  test('Wordubado header', async ({ page }) => {
    await start(page)
    await turnOnWordubado(page)
    await guessAll(page, ['crane'])
    await waitForResult(page)
    await shareButton(page).click()
    expect(
      (await readClipboard(page)).startsWith(
        'Unlimited Wordle - Wordubado 5 - 1/6\n\n🟩🟩🟩🟩🟩',
      ),
    ).toBe(true)
  })

  test('loss shares X/6 with all six rows', async ({ page }) => {
    await start(page)
    await guessAll(page, WRONG6)
    await waitForResult(page)
    await shareButton(page).click()
    const lines = (await readClipboard(page)).split('\n')
    expect(lines[0]).toBe('Wordle 5 - X/6')
    const grid = lines.slice(2, -2)
    expect(grid).toHaveLength(6)
    for (const l of lines.slice(1, -1)) expect(l).not.toMatch(/[a-z]/i)
  })

  test('Give Up shares X/6 with the rows played (D-13)', async ({ page }) => {
    await start(page)
    await giveUpAfter(page, ['house', 'ghost', 'plant', 'mouse'])
    await shareButton(page).click()
    const lines = (await readClipboard(page)).split('\n')
    expect(lines[0]).toBe('Wordle 5 - X/6')
    expect(lines.slice(2, -2)).toHaveLength(4)
  })

  test('4 and 6 letters use X/5 and X/7', async ({ page }) => {
    await start(page)
    await selectLength(page, 4)
    await guessAll(page, ['even', 'mile', 'must', 'back', 'tens'])
    await waitForResult(page)
    await shareButton(page).click()
    expect((await readClipboard(page)).split('\n')[0]).toBe('Wordle 4 - X/5')
    await resultDialog(page).getByRole('button', { name: 'Play again' }).click()
    await expect(resultDialog(page)).toBeHidden()
    await selectLength(page, 6)
    await guessAll(page, ['mother', 'silver', 'bridge', 'castle', 'sunset'])
    await page.getByRole('button', { name: 'Give up' }).click()
    await page
      .getByRole('dialog', { name: 'Give up?' })
      .getByRole('button', { name: 'Give up' })
      .click()
    await waitForResult(page)
    await shareButton(page).click()
    const lines = (await readClipboard(page)).split('\n')
    expect(lines[0]).toBe('Wordle 6 - X/7')
    expect(lines.slice(2, -2)).toHaveLength(5)
  })

  test('copied text matches an independently scored grid', async ({ page }) => {
    await start(page)
    await guessAll(page, ['house', 'ghost', 'crane'])
    await waitForResult(page)
    await shareButton(page).click()
    expect(await readClipboard(page)).toBe(
      expected('Wordle 5 - 3/6', 'crane', ['house', 'ghost', 'crane']),
    )
  })
})

test.describe('Copy failure (D-19)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium')
    await page.addInitScript(() => {
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: () =>
          Promise.reject(new DOMException('blocked', 'NotAllowedError')),
      })
    })
  })

  async function winAndShare(page: Page) {
    await start(page)
    await guessAll(page, ['house', 'crane'])
    await waitForResult(page)
    await shareButton(page).click()
  }

  const text = expected('Wordle 5 - 2/6', 'crane', ['house', 'crane'])

  test('shows the selectable box', async ({ page }) => {
    await winAndShare(page)
    const dlg = resultDialog(page)
    await expect(dlg.getByText(FAIL_NOTE)).toBeVisible()
    const box = dlg.getByRole('textbox', { name: 'Share text' })
    await expect(box).toBeFocused()
    await expect(box).toHaveAttribute('readonly', '')
    await expect(box).toHaveValue(text)
    const sel = await box.evaluate((el: HTMLTextAreaElement) => [
      el.selectionStart,
      el.selectionEnd,
      el.value.length,
    ])
    expect(sel).toEqual([0, text.length, text.length])
    await expect(shareButton(page)).toHaveText('Share')
  })

  test('Tab cycles into the textarea', async ({ page }) => {
    await winAndShare(page)
    const dlg = resultDialog(page)
    const box = dlg.getByRole('textbox', { name: 'Share text' })
    await box.focus()
    // The textarea is the last control, so Tab wraps to the first one (Show definition).
    await page.keyboard.press('Tab')
    await expect(
      dlg.getByRole('button', { name: 'Show definition' }),
    ).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(box).toBeFocused()
  })

  test('the box goes away on close', async ({ page }) => {
    await winAndShare(page)
    await closeResult(page)
    await page.getByRole('button', { name: 'See result' }).click()
    await waitForResult(page)
    await expect(
      resultDialog(page).getByRole('textbox', { name: 'Share text' }),
    ).toHaveCount(0)
  })

  test('axe with the box shown', async ({ page }) => {
    await winAndShare(page)
    const { expectNoA11yViolations } = await import('./axe.ts')
    await expectNoA11yViolations(page, 'dialog[open]')
  })
})

test.describe('Share sheet on phones (D-17, D-18)', () => {
  test.beforeEach(async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.addInitScript(() => {
      const w = window as unknown as {
        __shared: unknown[]
        __copied: string[]
        __shareMode: string
      }
      w.__shared = []
      w.__copied = []
      w.__shareMode = 'ok'
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: (d: unknown) => {
          w.__shared.push(d)
          if (w.__shareMode === 'abort')
            return Promise.reject(new DOMException('x', 'AbortError'))
          if (w.__shareMode === 'fail')
            return Promise.reject(new DOMException('x', 'NotAllowedError'))
          return Promise.resolve()
        },
      })
      const orig = navigator.clipboard.writeText.bind(navigator.clipboard)
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: (t: string) => {
          w.__copied.push(t)
          return orig(t)
        },
      })
    })
  })

  const text = expected('Wordle 5 - 2/6', 'crane', ['house', 'crane'])

  async function win(page: Page, mode: string) {
    await start(page)
    await page.evaluate((m) => {
      ;(window as unknown as { __shareMode: string }).__shareMode = m
    }, mode)
    await guessAll(page, ['house', 'crane'])
    await waitForResult(page)
  }

  test('opens the share sheet with the text only', async ({ page }) => {
    await win(page, 'ok')
    await shareButton(page).click()
    expect(
      await page.evaluate(
        () => (window as never as { __shared: unknown[] }).__shared,
      ),
    ).toEqual([{ text }])
    expect(
      await page.evaluate(
        () => (window as never as { __copied: unknown[] }).__copied,
      ),
    ).toEqual([])
    await expect(shareButton(page)).toHaveText('Share')
  })

  test('cancel does nothing', async ({ page }) => {
    await win(page, 'abort')
    await shareButton(page).click()
    await page.waitForTimeout(500)
    expect(
      await page.evaluate(
        () => (window as never as { __shared: unknown[] }).__shared,
      ),
    ).toHaveLength(1)
    expect(
      await page.evaluate(
        () => (window as never as { __copied: unknown[] }).__copied,
      ),
    ).toEqual([])
    await expect(shareButton(page)).toHaveText('Share')
  })

  test('other errors fall back to the clipboard', async ({ page }) => {
    await win(page, 'fail')
    await shareButton(page).click()
    await expect(shareButton(page)).toHaveText('Copied ✓')
    expect(
      await page.evaluate(
        () => (window as never as { __copied: unknown[] }).__copied,
      ),
    ).toEqual([text])
  })
})
