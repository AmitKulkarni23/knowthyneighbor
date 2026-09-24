---
paths:
  - "src/**/*"
---

# Frontend Universal Rules (Always Apply)

- TypeScript strict mode. No `any`. Ever.
- No raw fetch/axios outside `src/api/`
- No business logic in `src/pages/`
- No React imports in `src/api/` or `src/utils/`
- 2-space indentation

## Testing Protocol (RED/GREEN/REFACTOR)

When implementing any new frontend functionality:

1. Write the test FIRST using Vitest + React Testing Library. Run it. It MUST fail (RED).
2. Write the minimal implementation to make the test pass (GREEN).
3. Refactor if needed. Tests must still pass.

**RED FLAGS — stop and restart if you catch yourself doing any of these:**
- Writing a component before its test exists
- Writing a test that passes immediately without implementation
- Saying "I'll add tests after" or "this is too simple to test"
- Skipping the RED phase (test must fail first to prove it tests something)

Co-locate tests: `ComponentName.test.tsx` next to `ComponentName.tsx`
