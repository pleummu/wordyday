import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'

export const TEST_ANSWERS = { 4: 'gold', 5: 'crane', 6: 'planet' }

export async function fixAnswers(
  page: Page,
  { help = false }: { help?: boolean } = {},
): Promise<void> {
  await page.addInitScript(
    ({ a, skipHelp }) => {
      ;(globalThis as { __WORDLE_TEST__?: unknown }).__WORDLE_TEST__ = {
        answers: a,
        skipHelp,
      }
    },
    { a: TEST_ANSWERS, skipHelp: !help },
  )
}

export async function fixAnswersWith(
  page: Page,
  answers: Partial<Record<4 | 5 | 6, string>>,
  { help = false }: { help?: boolean } = {},
): Promise<void> {
  await page.addInitScript(
    ({ a, skipHelp }) => {
      ;(globalThis as { __WORDLE_TEST__?: unknown }).__WORDLE_TEST__ = {
        answers: a,
        skipHelp,
      }
    },
    { a: { ...TEST_ANSWERS, ...answers }, skipHelp: !help },
  )
}

// Reads the reviewed slang list from the built chunk; the owner's cuts decide membership.
export function slangWords(n: 4 | 5 | 6): string[] {
  const raw = JSON.parse(
    readFileSync(
      new URL(`../src/data/words-${n}.json`, import.meta.url),
      'utf8',
    ),
  ) as { slang: string }
  return raw.slang.split(' ').filter(Boolean)
}

export async function turnOnWordubado(
  page: Page,
  { firstTime = true }: { firstTime?: boolean } = {},
): Promise<void> {
  const sw = page.getByRole('switch', { name: 'Wordubado' })
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  if (firstTime) {
    await dismissInfo(page)
  }
  await waitForReady(page)
}

export async function waitForReady(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Enter' })).toBeEnabled()
}

export async function guess(
  page: Page,
  word: string,
  row: number,
): Promise<void> {
  await page.keyboard.type(word)
  await page.keyboard.press('Enter')
  const last = word.at(-1)!.toUpperCase()
  await expect(
    page.getByRole('gridcell', {
      name: new RegExp(
        `^Row ${row}, column ${word.length}, letter ${last}, (correct|present|absent)$`,
      ),
    }),
  ).toBeVisible()
}

export async function selectLength(page: Page, n: number): Promise<void> {
  await page.getByRole('radio', { name: `${n} letters` }).click()
  await waitForReady(page)
}

export async function dismissInfo(page: Page): Promise<void> {
  const dlg = page.getByRole('dialog', { name: "What's Wordubado?" })
  await expect(dlg).toBeVisible()
  await expect(
    dlg.getByText('Heads up: some words are mildly crude.'),
  ).toBeVisible()
  await dlg.getByRole('button', { name: 'Got it' }).click()
  await expect(dlg).toBeHidden()
}

export async function guessAll(
  page: Page,
  words: string[],
  startRow = 1,
): Promise<void> {
  for (const [i, word] of words.entries()) {
    await guess(page, word, startRow + i)
  }
}

export function cell(page: Page, row: number, col: number) {
  return page.getByRole('gridcell', {
    name: new RegExp(`^Row ${row}, column ${col}, `),
  })
}

const ATTEMPTS = { 4: 5, 5: 6, 6: 7 } as const

export function defaultV2State(): Record<string, unknown> {
  const stats: Record<string, unknown> = {}
  for (const mode of ['normal', 'wordubado']) {
    for (const n of [4, 5, 6] as const) {
      stats[`${mode}-${n}`] = {
        played: 0,
        wins: 0,
        gaveUp: 0,
        dist: new Array<number>(ATTEMPTS[n]).fill(0),
        winStreak: 0,
        bestWinStreak: 0,
        last: null,
        lastCounted: null,
      }
    }
  }
  return {
    boards: {},
    last: { mode: 'normal', length: 5 },
    wordubadoInfoSeen: false,
    stats,
    dayStreak: { current: 0, longest: 0, lastActiveDate: null },
    restores: { month: '', used: 0 },
    pendingRestore: null,
    streakRev: 0,
  }
}

// Seeds the save only when the key is absent, so reloads keep the app's own writes.
// overrides.stats is merged per Board key.
export async function seedSave(
  page: Page,
  overrides: Record<string, unknown> = {},
  { version = 2 }: { version?: number } = {},
): Promise<void> {
  const base = defaultV2State()
  const { stats: statOverrides, ...rest } = overrides as {
    stats?: Record<string, Record<string, unknown>>
  }
  const stats = base.stats as Record<string, Record<string, unknown>>
  for (const [k, v] of Object.entries(statOverrides ?? {})) {
    stats[k] = { ...stats[k], ...v }
  }
  const state = { ...base, ...rest, stats }
  await page.addInitScript(
    (doc) => {
      if (localStorage.getItem('unlimited-wordle') === null) {
        localStorage.setItem('unlimited-wordle', JSON.stringify(doc))
      }
    },
    { version, state },
  )
}

export function resultDialog(page: Page) {
  return page.locator('dialog[open]:has(.result-heading)')
}

export async function waitForResult(page: Page): Promise<void> {
  await expect(resultDialog(page)).toBeVisible()
}

export async function closeResult(page: Page): Promise<void> {
  await page.keyboard.press('Escape')
  await expect(resultDialog(page)).toBeHidden()
}
