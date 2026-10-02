import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'

export const TEST_ANSWERS = { 4: 'gold', 5: 'crane', 6: 'planet' }

export async function fixAnswers(page: Page): Promise<void> {
  await page.addInitScript((a) => {
    ;(globalThis as { __WORDLE_TEST__?: unknown }).__WORDLE_TEST__ = {
      answers: a,
    }
  }, TEST_ANSWERS)
}

export async function fixAnswersWith(
  page: Page,
  answers: Partial<Record<4 | 5 | 6, string>>,
): Promise<void> {
  await page.addInitScript(
    (a) => {
      ;(globalThis as { __WORDLE_TEST__?: unknown }).__WORDLE_TEST__ = {
        answers: a,
      }
    },
    { ...TEST_ANSWERS, ...answers },
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

export async function turnOnWordubado(page: Page): Promise<void> {
  const sw = page.getByRole('switch', { name: 'Wordubado' })
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'true')
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
