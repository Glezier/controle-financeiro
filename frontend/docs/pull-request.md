# Sugestão de pull request

Base pretendida: `main`. Branch: `frontend-implementation`.

## Título

`feat: implement financial control frontend`

## Descrição

Add an independent React/TypeScript frontend for the financial control system, with visual authentication, a dashboard, transaction management, category management and financial reports. Screens follow the Stitch references, with reusable components, responsive layouts and keyboard navigation.

Transactions and categories share an asynchronous service layer backed by isolated in-memory data. Paid income and expenses determine balances and charts; pending movements remain separate. Categories with linked transactions cannot be deleted or change type, while renaming preserves their history. Frontend API expectations remain provisional.

Validation:

- `npm run build` and `npm run lint` pass.
- 84 Vitest tests pass for validation, services, ownership and financial rules.
- 24 Playwright tests pass against the production build in Edge headless.
- Six screens checked at 320, 768 and 1440 px; 19 local captures support the documented visual comparison.
- JavaScript page exceptions are checked by the E2E suite.
- Production dependency audit reports zero alerts. The existing ESLint/minimatch development-tooling advisory is documented in `frontend/docs/validation.md`.

Backend and reference files are unchanged. Authentication and financial data are simulated and reset on reload; no real API, server authentication, PDF/CSV export, password recovery, budget or reserve workflow is included.

See `frontend/README.md` for setup and `frontend/docs/validation.md` for test reproduction, visual differences, generated artifacts and limitations.
