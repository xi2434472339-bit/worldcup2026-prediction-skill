# Changelog

## 2026-06-14

- Added the first Netlify deployable React website implementation for 戈瓦预测.
- Added Netlify Functions for fixtures, predictions, stats, redemption, admin, scheduled football sync, and official prediction jobs.
- Added shared domain, team, fixture, prediction cache, settlement, and public stats logic.
- Added Node test coverage for prediction validation, fixture schedule behavior, official prediction windows, and OpenRouter request handling.
- Added `package-lock.json` after installing project dependencies.
- Fixed TypeScript production build errors in shared fixture imports, Blob list typing, and cache null handling.
- Improved local Netlify environment handling so unavailable runtime env access falls back safely.
- Improved OpenRouter network failure reporting with a clear server error message.
- Documented progress, deployment notes, and remaining operational risks.
