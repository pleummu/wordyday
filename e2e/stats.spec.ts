import { expect, test } from '@playwright/test'
import { expectNoA11yViolations } from './axe.ts'
import {
  closeResult,
  dismissInfo,
  fixAnswers,
  guess,
  seedSave,
  selectLength,
  waitForReady,
  waitForResult,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

const win = (guesses: number, seq: number) => ({
  won: true,
  guesses,
  seq,
})

test.describe('Statistics dialog', () => {
  test('empty state on first open (D-05)', async ({ page }) => {
    await fixAnswers(page)
    await page.goto('/')
    await waitForReady(page)
    const button = page.getByRole('button', { name: 'Statistics', exact: true })
    await button.click()
    const dialog = page.getByRole('dialog', { name: 'Statistics' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('radio', { name: 'Normal' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(
      dialog.getByRole('tab', { name: '5 letters' }),
    ).toHaveAttribute('aria-selected', 'true')
    await expect(dialog.getByText('Played', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Win %', { exact: true })).toBeVisible()
    await expect(dialog.locator('.stat-value').nth(1)).toHaveText('—')
    await expect(dialog.getByText('Gave up: 0')).toBeVisible()
    await expect(dialog.getByText('No wins yet. Go play one!')).toBeVisible()
    await expect(dialog.getByText('Avg guesses: —')).toBeVisible()
    const text = (await dialog.textContent()) ?? ''
    expect(text).not.toContain('NaN')
    expect(text).not.toContain('Infinity')
    expect(text).not.toContain('0%')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(button).toBeFocused()
  })

  test('after a win in 2 guesses (STAT-01, D-04)', async ({ page }) => {
    await fixAnswers(page)
    await page.goto('/')
    await waitForReady(page)
    await guess(page, 'house', 1)
    await guess(page, 'crane', 2)
    await waitForResult(page)
    await closeResult(page)
    await page.getByRole('button', { name: 'Statistics', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Statistics' })
    await expect(dialog.locator('.stat-value').first()).toHaveText('1')
    await expect(dialog.getByText('100%')).toBeVisible()
    await expect(
      dialog.getByRole('listitem', { name: '2 guesses: 1 win, latest win' }),
    ).toBeVisible()
  })

  test('opens on the current Board (D-02)', async ({ page }) => {
    await fixAnswers(page)
    await page.goto('/')
    await waitForReady(page)
    await page.getByRole('switch', { name: 'Wordubado' }).click()
    await dismissInfo(page)
    await waitForReady(page)
    await selectLength(page, 6)
    await page.getByRole('button', { name: 'Statistics', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Statistics' })
    await expect(
      dialog.getByRole('radio', { name: 'Wordubado' }),
    ).toHaveAttribute('aria-checked', 'true')
    await expect(
      dialog.getByRole('tab', { name: '6 letters' }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  test('All tab sums one mode only (D-03, STAT-02)', async ({ page }) => {
    await fixAnswers(page)
    await seedSave(page, {
      stats: {
        'normal-4': {
          played: 2,
          wins: 2,
          dist: [0, 1, 1, 0, 0],
          winStreak: 2,
          bestWinStreak: 2,
          last: win(3, 2),
        },
        'normal-6': {
          played: 1,
          wins: 1,
          dist: [0, 0, 0, 0, 0, 0, 1],
          winStreak: 1,
          bestWinStreak: 1,
          last: win(7, 3),
        },
        'wordubado-5': { played: 5, wins: 0, gaveUp: 2 },
      },
    })
    await page.goto('/')
    await waitForReady(page)
    await page.getByRole('button', { name: 'Statistics', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Statistics' })
    await dialog.getByRole('tab', { name: 'All lengths' }).click()
    await expect(dialog.locator('.stat-value').first()).toHaveText('3')
    await expect(dialog.getByText('100%')).toBeVisible()
    await expect(dialog.getByText('Current win streak')).toHaveCount(0)
    await expect(
      dialog.getByRole('listitem', { name: '7 guesses: 1 win, latest win' }),
    ).toBeVisible()
    await dialog.getByRole('radio', { name: 'Wordubado' }).click()
    await expect(dialog.locator('.stat-value').first()).toHaveText('5')
    await expect(dialog.getByText('0%')).toBeVisible()
    await expect(dialog.getByText('Gave up: 2')).toBeVisible()
    await expect(dialog.getByText('No wins yet. Go play one!')).toBeVisible()
    await expect(dialog.getByText('Avg guesses: —')).toBeVisible()
  })

  test('keyboard: arrows move tabs', async ({ page }) => {
    await fixAnswers(page)
    await page.goto('/')
    await waitForReady(page)
    await page.getByRole('button', { name: 'Statistics', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Statistics' })
    await dialog.getByRole('tab', { name: '5 letters' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(
      dialog.getByRole('tab', { name: '6 letters' }),
    ).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('End')
    await expect(
      dialog.getByRole('tab', { name: 'All lengths' }),
    ).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Home')
    await expect(
      dialog.getByRole('tab', { name: '4 letters' }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  test.describe('with animation', () => {
    test.use({ reducedMotion: 'no-preference' })
    test('Statistics is disabled while revealing (D-21)', async ({ page }) => {
      await fixAnswers(page)
      await page.goto('/')
      await waitForReady(page)
      await page.keyboard.type('house')
      await page.keyboard.press('Enter')
      const button = page.getByRole('button', {
        name: 'Statistics',
        exact: true,
      })
      await expect(button).toBeDisabled()
      await expect(button).toBeEnabled({ timeout: 5000 })
    })
  })

  test('axe: Statistics dialog on every tab in both modes', async ({
    page,
  }) => {
    await fixAnswers(page)
    const stats: Record<string, unknown> = {}
    let seq = 1
    for (const mode of ['normal', 'wordubado']) {
      for (const n of [4, 5, 6]) {
        const dist = new Array<number>(n + 1).fill(0)
        dist[1] = 2
        dist[2] = 1
        stats[`${mode}-${n}`] = {
          played: 3,
          wins: 3,
          dist,
          winStreak: 3,
          bestWinStreak: 3,
          last: win(3, seq++),
        }
      }
    }
    await seedSave(page, { stats })
    await page.goto('/')
    await waitForReady(page)
    await page.getByRole('button', { name: 'Statistics', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Statistics' })
    await expect(dialog).toBeVisible()
    for (const mode of ['Normal', 'Wordubado']) {
      await dialog.getByRole('radio', { name: mode }).click()
      for (const tab of [
        '4 letters',
        '5 letters',
        '6 letters',
        'All lengths',
      ]) {
        await dialog.getByRole('tab', { name: tab }).click()
        await expectNoA11yViolations(page, 'dialog[open]')
      }
    }
  })

  test('axe: empty-state Statistics dialog', async ({ page }) => {
    await fixAnswers(page)
    await page.goto('/')
    await waitForReady(page)
    await page.getByRole('button', { name: 'Statistics', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Statistics' })).toBeVisible()
    await expectNoA11yViolations(page, 'dialog[open]')
  })
})
