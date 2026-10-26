# Linora cross-platform — Phase One

Status: design and mobile UI scaffold only; not production-ready.

## Preserve existing architecture
- Keep `apps/web` Next.js routes, page hierarchy, authentication and dashboard navigation unchanged.
- Keep `apps/api` FastAPI as the shared service boundary; Supabase PostgreSQL/Auth/Storage and RAG remain server-controlled.
- Mobile: `apps/mobile` Expo/React Native for Android and iOS. The initial screen is deliberately static; no credentials, database or API calls.
- Desktop: proposed Tauri shell for macOS and Linux in a later phase, reusing the existing web UI; do not introduce a separate business-logic implementation.

## Brand and marketing direction
Positioning: **Your factory. Your data. Your intelligence.**
Bangla campaign concept: **ফাইল খুঁজবেন না। উত্তর খুঁজুন।**
Buyer: Bangladesh factory owners, general managers, compliance and operations leaders.
Do not claim certified compliance, verified ROI, or production-grade security without evidence.

## Phase One acceptance gates
1. Existing Next.js routes and layout remain untouched.
2. Mobile UI renders with safe-area layout and Android/iOS navigation.
3. Add branded typography, colors and accessibility checks; Bangla/English localization to follow.
4. Define API contract, mobile session storage, token refresh, tenant authorization, offline-data policy and file-upload restrictions before connecting live data.
5. Reproduce cross-tenant JWT tests and audit privileged SQL functions before pilot factory onboarding.
6. Validate mobile build and device behavior in CI before claiming store readiness.

## Next development slices
- Shared typed API client with authenticated endpoints; never embed Supabase privileged credentials in mobile apps.
- Real sign-in, secure token storage, factory selection, read-only dashboard and document search.
- Camera document capture, upload queue, alerts, and permission-scoped AI assistant.
- Tauri desktop prototype for macOS/Linux with tested OS packaging and updates.

## Local mobile development
From `apps/mobile`: `npm install`, then `npm run start` and open Android or iOS with Expo tooling. Expo SDK dependency compatibility and device builds must be verified; no build was executed by this GitHub-only change.
