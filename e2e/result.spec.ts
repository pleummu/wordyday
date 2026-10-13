import { expect, test, type Page } from '@playwright/test'
import { resultDelayMs } from '../src/logic/timing.ts'
import { expectNoA11yViolations } from './axe.ts'
import {
  closeResult,
  fixAnswers,
  guess,
  guessAll,
  resultDialog,
  selectLength,
  waitForReady,
  waitForResult,
} from './helpers.ts'

const WRONG6 = ['house', 'ghost', 'plant', 'mouse', 'stone', 'brick']

test.beforeEach(async ({ page }) => {
  await fixAnswers(page)
})

async function start(page: Page) {
  await page.goto('/')
  await waitForReady(page)
}

async function playAgainFromModal(page: Page) {
  await resultDialog(page).getByRole('button', { name: 'Play again' }).click()
  await expect(resultDialog(page)).toBeHidden()
  await waitForReady(page)
}

test.describe('Result modal (D-01, D-04)', () => {
  test.use({ reducedMotion: 'reduce' })

  test('win shows heading, answer, stats and Play again', async ({ page }) => {
    await start(page)
    await guessAll(page, ['house', 'crane'])
    await waitForResult(page)
    const dlg = resultDialog(page)
    await expect(dlg.getByRole('heading', { level: 2 })).toHaveText(
      'You got it in 2/6!',
    )
    await expect(dlg.locator('.result-answer')).toContainText('crane')
    await expect(dlg.locator('.result-answer')).toContainText('The word was')
    await expect(dlg.locator('.stat-value')).toHaveText(['1', '100%', '1', '1'])
    await expect(
      dlg.getByRole('heading', { name: 'Guess distribution' }),
    ).toBeVisible()
    await expect(
      dlg.locator('li[aria-label="2 guesses: 1 win, latest win"]'),
    ).toHaveCount(1)
    await expect(dlg.getByRole('button', { name: 'Play again' })).toBeFocused()
  })

  test('loss shows Out of guesses and the no-wins line', async ({ page }) => {
    await start(page)
    await guessAll(page, WRONG6)
    await waitForResult(page)
    const dlg = resultDialog(page)
    await expect(dlg.getByRole('heading', { level: 2 })).toHaveText(
      'Out of guesses',
    )
    await expect(dlg.getByText('No wins yet. Go play one!')).toBeVisible()
    await expect(dlg.locator('[data-highlight]')).toHaveCount(0)
  })

  test('Give Up opens the modal right after the confirm', async ({ page }) => {
    await start(page)
    await guessAll(page, ['house', 'ghost', 'plant', 'mouse'])
    await page.getByRole('button', { name: 'Give up' }).click()
    const confirm = page.getByRole('dialog', { name: 'Give up?' })
    await confirm.getByRole('button', { name: 'Give up' }).click()
    await expect(resultDialog(page)).toBeVisible({ timeout: 1000 })
    await expect(
      resultDialog(page).getByRole('heading', { level: 2 }),
    ).toHaveText('You gave up')
  })

  test('a Forfeit opens no Result modal', async ({ page }) => {
    await start(page)
    await guessAll(page, ['house', 'ghost', 'plant', 'mouse'])
    await page.getByRole('button', { name: 'New game' }).click()
    const confirm = page.getByRole('dialog', { name: 'New game?' })
    await confirm.getByRole('button', { name: 'New game' }).click()
    await waitForReady(page)
    await expect(resultDialog(page)).toHaveCount(0)
  })

  test('Play again in the modal starts a new game and closes it (D-06)', async ({
    page,
  }) => {
    await start(page)
    await guessAll(page, ['house', 'crane'])
    await waitForResult(page)
    await playAgainFromModal(page)
    await expect(
      page.getByRole('gridcell', { name: 'Row 1, column 1, empty' }),
    ).toBeVisible()
  })

  test('Enter on the focused Play again starts the next game (D-30)', async ({
    page,
  }) => {
    await start(page)
    await guessAll(page, ['house', 'crane'])
    await waitForResult(page)
    await page.keyboard.press('Enter')
    await waitForReady(page)
    await expect(resultDialog(page)).toHaveCount(0)
  })

  test('reload of a finished Board does not auto-open (D-02)', async ({
    page,
  }) => {
    await start(page)
    await guessAll(page, ['house', 'crane'])
    await waitForResult(page)
    await page.reload()
    await expect(page.locator('.banner')).toBeVisible()
    await page.waitForTimeout(1000)
    await expect(resultDialog(page)).toHaveCount(0)
  })

  test('axe passes with the modal open', async ({ page }) => {
    await start(page)
    await guessAll(page, ['house', 'crane'])
    await waitForResult(page)
    await expectNoA11yViolations(page, 'dialog[open]')
    await playAgainFromModal(page)

    await guessAll(page, WRONG6)
    await waitForResult(page)
    await expectNoA11yViolations(page, 'dialog[open]')
    await playAgainFromModal(page)

    await guessAll(page, ['house', 'ghost', 'plant', 'mouse'])
    await page.getByRole('button', { name: 'Give up' }).click()
    await page
      .getByRole('dialog', { name: 'Give up?' })
      .getByRole('button', { name: 'Give up' })
      .click()
    await waitForResult(page)
    await expectNoA11yViolations(page, 'dialog[open]')
    await closeResult(page)
  })
})

test.describe('Result timing (D-20, D-21)', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('win opens after bounce + 400 ms and blocks input meanwhile', async ({
    page,
  }) => {
    await start(page)
    await page.keyboard.type('crane')
    await page.keyboard.press('Enter')
    await expect(page.locator('.banner')).toBeVisible()
    await expect(resultDialog(page)).toBeHidden()
    await expect(
      page.getByRole('button', { name: 'Statistics', exact: true }),
    ).toBeDisabled()
    await expect(page.getByRole('switch', { name: 'Wordubado' })).toBeDisabled()
    await expect(resultDialog(page)).toBeVisible({
      timeout: resultDelayMs('won', 5, false) + 1500,
    })
  })

  test('loss opens after 600 ms', async ({ page }) => {
    await start(page)
    for (const w of WRONG6.slice(0, 5)) {
      await guess(page, w, WRONG6.indexOf(w) + 1)
    }
    await page.keyboard.type(WRONG6[5])
    await page.keyboard.press('Enter')
    await expect(page.locator('.banner')).toBeVisible()
    await expect(resultDialog(page)).toBeHidden()
    await expect(resultDialog(page)).toBeVisible({
      timeout: resultDelayMs('lost', 5, false) + 1500,
    })
  })

  test('win flourish attribute', async ({ page }) => {
    await start(page)
    await page.keyboard.type('crane')
    await page.keyboard.press('Enter')
    await waitForResult(page)
    await expect(
      resultDialog(page).locator('.result-panel[data-flourish]'),
    ).toHaveCount(1)
  })
})

test.describe('Slim banner (D-01, D-05, D-29, D-31)', () => {
  test.use({ reducedMotion: 'reduce' })

  async function winInTwo(page: Page) {
    await start(page)
    await guessAll(page, ['house', 'crane'])
    await waitForResult(page)
  }

  test('win banner', async ({ page }) => {
    await winInTwo(page)
    await closeResult(page)
    const banner = page.locator('.banner')
    await expect(
      banner.getByRole('heading', { name: 'Solved in 2' }),
    ).toBeVisible()
    await expect(
      banner.getByRole('button', { name: 'See result' }),
    ).toBeVisible()
    await expect(
      banner.getByRole('button', { name: 'Play again' }),
    ).toBeVisible()
    await expect(banner.getByRole('button', { name: 'Share' })).toHaveCount(0)
    await expect(banner).not.toContainText(/Win streak/i)
  })

  test('loss banner', async ({ page }) => {
    await start(page)
    await guessAll(page, WRONG6)
    await waitForResult(page)
    await closeResult(page)
    await expect(
      page
        .locator('.banner')
        .getByRole('heading', { name: 'The word was CRANE' }),
    ).toBeVisible()
  })

  test('Give Up banner', async ({ page }) => {
    await start(page)
    await guessAll(page, ['house', 'ghost', 'plant', 'mouse'])
    await page.getByRole('button', { name: 'Give up' }).click()
    await page
      .getByRole('dialog', { name: 'Give up?' })
      .getByRole('button', { name: 'Give up' })
      .click()
    await waitForResult(page)
    await closeResult(page)
    const banner = page.locator('.banner')
    await expect(
      banner.getByRole('heading', { name: 'You gave up' }),
    ).toBeVisible()
    await expect(banner).toContainText('The word was CRANE')
  })

  test('See result reopens and focus returns', async ({ page }) => {
    await winInTwo(page)
    await closeResult(page)
    const see = page.getByRole('button', { name: 'See result' })
    await expect(see).toBeFocused()
    for (let i = 0; i < 2; i++) {
      await see.click()
      await waitForResult(page)
      await expect(resultDialog(page).locator('[data-flourish]')).toHaveCount(0)
      await expect(
        resultDialog(page).getByRole('button', { name: 'Play again' }),
      ).toBeFocused()
      await closeResult(page)
      await expect(see).toBeFocused()
    }
  })

  test('D-31 letters and Enter do nothing on a finished Board', async ({
    page,
  }) => {
    await winInTwo(page)
    await closeResult(page)
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
    await page.keyboard.type('abc')
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('gridcell', { name: /Row 1, column 1, empty/ }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('gridcell', { name: /Row 3, column 1, empty/ }),
    ).toHaveCount(1)
    await expect(resultDialog(page)).toHaveCount(0)
  })

  test('Enter on a focused See result opens the modal', async ({ page }) => {
    await winInTwo(page)
    await closeResult(page)
    await expect(page.getByRole('button', { name: 'See result' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(resultDialog(page)).toBeVisible()
  })

  test('D-02 Board switch back shows banner only', async ({ page }) => {
    await winInTwo(page)
    await closeResult(page)
    await selectLength(page, 4)
    await page.getByRole('radio', { name: '5 letters' }).click()
    await expect(page.locator('.banner')).toBeVisible()
    await page.waitForTimeout(1000)
    await expect(resultDialog(page)).toHaveCount(0)
    await page.getByRole('button', { name: 'See result' }).click()
    await expect(resultDialog(page)).toBeVisible()
  })

  test('D-05 Win Streak lives in the modal', async ({ page }) => {
    await winInTwo(page)
    const dlg = resultDialog(page)
    const streak = dlg.locator('.stat').nth(2)
    await expect(streak.locator('.stat-value')).toHaveText('1')
    await playAgainFromModal(page)
    await guessAll(page, WRONG6)
    await waitForResult(page)
    await expect(streak.locator('.stat-value')).toHaveText('0')
    await expect(dlg).toContainText('Current win streak 0, reset')
    await playAgainFromModal(page)
    await guessAll(page, WRONG6)
    await waitForResult(page)
    await expect(streak.locator('.visually-hidden')).toHaveText(
      'Current win streak 0',
    )
  })

  test('D-05 Day Streak toast still fires', async ({ page }) => {
    await start(page)
    await guessAll(page, ['house', 'crane'])
    await expect(
      page.locator('.toast-layer').getByText('Day streak: 1'),
    ).toBeVisible()
  })
})

test.describe('Result timing, reduced motion (D-23)', () => {
  test.use({ reducedMotion: 'reduce' })

  test('win opens quickly with no flourish', async ({ page }) => {
    await start(page)
    await page.keyboard.type('crane')
    await page.keyboard.press('Enter')
    await expect(resultDialog(page)).toBeVisible({
      timeout: resultDelayMs('won', 5, true) + 1500,
    })
    await expect(resultDialog(page).locator('[data-flourish]')).toHaveCount(0)
  })
})
