# Linora Executive — iOS product strategy

**Status:** Proposal only. No iOS app has been built or submitted.

## Positioning

**Linora Executive** should be a companion for manufacturing owners, managing directors, CFOs, compliance directors, and group operations heads. It must be a real mobile product, not the desktop website in a WKWebView.

An iOS-first sales thesis is plausible for some executive buyers, but it is a *hypothesis*. Interview prospective Bangladeshi factory decision-makers before making iOS the only supported interface; compliance officers and operations teams also require desktop and Android access.

## iPhone and iPad experience

The first release should support:
1. A private executive briefing: outstanding evidence requests, overdue CAPs, upcoming audit due dates, with actual tenant-scoped records and clear 'data as of' timestamps.
2. Read-only evidence drill-down: open an item, review source PDF/page and audit notes; never label an AI suggestion 'certified'.
3. Decisions and assignments: approve or request human review using a documented permission model and immutable audit trail; implement these backend controls *before* adding iOS controls.
4. Opt-in actionable alerts: expiring evidence, high-priority corrective-action reminders and factory-specific operational exceptions; APNs tokens must be device-bound, revocable, and tenant-scoped.
5. Secure account use: Supabase sign-in/SSO, short session handling, Keychain-backed tokens, biometric app lock as a local convenience (not a replacement for server authorization).
6. iPad-optimized executive summaries with accessible typography and concise Bangla/English labels.

## Technology recommendation

- **React Native + Expo Router + TypeScript** for a small team already building Next.js in TypeScript, reusing domain schemas and design tokens where feasible, *not* web components.
- **Backend:** a versioned, mobile-safe API whose authorization verifies Supabase access tokens on the server; existing Next.js cookie-only route handlers should not simply be exposed as mobile endpoints. Consider dedicated FastAPI JWT bearer endpoints after integration and security tests.
- **Data:** Supabase Postgres, Auth and Storage; enforce RLS plus per-record tenant checks on server endpoints. Publishable key only in the app binary. Never ship a service secret or Groq key to iOS.
- **SDKs:** Expo SecureStore for storage (evaluate Keychain accessibility), Expo Notifications for APNs, Expo LocalAuthentication for optional Face ID lock, signed URLs for evidence previews.
- Offline: cache only least-sensitive high-level data with short expiry; disable local caching for confidential documents unless explicitly approved and encrypted.
- Testing: devices covering smaller iPhones, modern large iPhones and iPads; VoiceOver, Dynamic Type, Bengali text rendering, reconnect/logout, token expiry.

## Delivery and go-to-market sequence

**Gate A — Fix web compliance:** Heroku operation, two-tenant security regression, correctly permissioned CAP workflow, reliable evidence binder; validate usage and executive demand through 5–10 interviews.

**Gate B — Build native pilot:** Create `apps/mobile` as a new Expo workspace with authentication, briefing cards, evidence detail, navigation, and secure session lifecycle. Use mock/sample fixtures clearly labelled in development; do not ship fictional factory metrics.

**Gate C — TestFlight:** Apple Developer Program and organization branding, App Store Connect identifiers, privacy disclosures, crash reporting, demo account/demo mode, TestFlight feedback from a small group of authorized pilot executives.

**Gate D — App Store / private distribution:** Review minimum functionality and enterprise-service rules; ship only after privacy/security review and on-device regression checks. For exclusively organization-sold enterprise subscriptions, Apple Guideline 3.1.3(c) may allow access to previously purchased services without in-app purchases; confirm the business model with current Apple rules before submitting.

## Critical App Store requirements

- Guideline 4.2 requires the iOS experience to provide substantive native functionality beyond a wrapped site.
- App Review requires a functioning, reviewable app and sample login/demo mode where sign-in is required.
- Do not imply the software provides legal audit certification.
- Apple Developer Program annual membership is typically US$99 (local price may vary).
- Expo EAS Build and Submit can build and upload an iOS application without a macOS workstation; App Store review and release remain separate actions.

## Primary sources

- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/help/account/membership/program-enrollment
- https://docs.expo.dev/develop/development-builds/introduction/
- https://docs.expo.dev/submit/ios/
