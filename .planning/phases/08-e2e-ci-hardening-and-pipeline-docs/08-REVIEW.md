---
phase: 08-e2e-ci-hardening-and-pipeline-docs
reviewed: 2026-10-16T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - scripts/check-bundle.mjs
  - .github/workflows/ci.yml
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 8: Code Review Report

**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Entry-asset detection matches the real `dist/index.html` (`<script type="module" crossorigin src="/assets/index-*.js">` and `<link rel="stylesheet" crossorigin href="/assets/index-*.css">`). The budget calls `fail()`, which sets `failed`. The table prints before `if (failed) process.exit(1)`, so it appears on both pass and fail. Nothing that existed before was broken: the removed `statSync` import is unused, and no non-planning file references the removed per-pool lines. The cache key and the hit/miss logic are correct, and the Actions expression syntax is valid. Two robustness gaps remain.

## Warnings

### WR-01: Budget can pass vacuously when no entry CSS is found

**File:** `scripts/check-bundle.mjs:130-143`
**Issue:** The script exits with an error when there is no entry script. It has no equivalent guard for CSS. If the stylesheet link changes shape (for example `rel='stylesheet'`, single quotes, or CSS inlined), `entryCss` is empty, `entryCssGz` is 0 and the CSS budget passes silently. The regexes also require double-quoted attributes, as the pre-existing ones do.
**Fix:**
```js
if (entryCss.size === 0) fail('no entry stylesheet found in dist/index.html.')
```

### WR-02: gz() throws with no table if an entry href does not resolve to a file

**File:** `scripts/check-bundle.mjs:127,136-139`
**Issue:** `gz(n)` calls `readFileSync` on every `startNames`/`entryCss` entry. If any of them is an absolute URL, carries a query string or a base prefix, or is missing, the script dies with an uncaught ENOENT stack trace. The size table is never printed. This breaks the stated "table on pass and fail" contract in that case. Exit is still non-zero, so CI does fail.
**Fix:** Wrap the read in the `gz` helper. Use `existsSync` and call `fail(\`${rel} not found in dist\`)`, returning 0.

## Info

### IN-01: Playwright cache is saved only when the whole job succeeds

**File:** `.github/workflows/ci.yml:55-59`
**Issue:** `actions/cache` saves in its post step only if the job succeeds. If the first run on a new Playwright version has failing tests, the cache is not saved and the next run is another full install. This is only a speed concern.
**Fix:** Optionally split into `actions/cache/restore` and `actions/cache/save` with `if: always()`. This is not required.

### IN-02: `poolTag` can contain an "undefined" key

**File:** `scripts/check-bundle.mjs:146-148`
**Issue:** When a pool check failed, `found[n]` is undefined and `Object.fromEntries` creates the key "undefined". It is harmless because no file is named that, but it is sloppy.
**Fix:** Add `.filter(([f]) => f)` before `Object.fromEntries`.

---

_Reviewed: 2026-10-16T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
