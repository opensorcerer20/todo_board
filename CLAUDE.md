## Test Failure Policy

When a unit test fails, **do not modify the test or the implementation to make it pass** unless I explicitly ask you to fix it.

Instead:
1. Report which test(s) failed and the relevant error/assertion output.
2. Investigate and explain the likely root cause (e.g., implementation bug, outdated test expectations, flaky test, environment issue, missing fixture/mock).
3. Propose options if there's ambiguity (e.g., "this looks like the test is outdated" vs "this looks like a real regression in X").
4. Wait for my go-ahead before changing any code or test files.

This applies to:
- Tests that fail after you've made code changes
- Pre-existing failing tests you encounter while working on something else
- Tests that fail in CI

Exceptions (you may fix without asking):
- Trivial syntax errors in a test you just wrote yourself in this same session
- I explicitly say "fix the failing tests" or similar

If you're unsure whether something counts as "fixing," default to investigating and reporting first.
