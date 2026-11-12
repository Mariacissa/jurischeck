# Project memory

## Product intent & audience

- JurisCheck: legal document review tool for Brazilian lawyers (advogados).
- Users upload/extract document text; app generates demonstrative legal reports.
- Without an account, users can extract text but are prompted to sign up to generate/save reports.
- Logged-in users get cloud-persisted review history.

## Brand personality & voice

- UI language is Portuguese (Brazilian).
- Tone is professional, legal-oriented, trustworthy.
- Existing visual identity must be preserved across changes.

## Visual design & UX direction

- React + TypeScript + Vite stack (`JurisCheck_Lovable_Starter/` project directory).
- Auth UI: modal-based sign-up/sign-in form with error messages, sign-out button in header and sidebar.
- Sidebar shows user name + initials when logged in; "Advogado / Não conectado" when logged out.
- Settings page displays real connection status, user email, current plan.
- Overview page shows account-creation prompt for unauthenticated users.
- CSS classes used: auth modal form, spinner, signout button, auth-prompt, auth-error, auth-switch.

## Decisions, constraints & rationale

- Supabase auth + database backend. Env vars must be in project-dir `.env` for Vite (root `.env` alone is insufficient).
- Database tables: `profiles` (lawyer profile) and `reviews` (saved reports), both with RLS enabled — users only access own rows.
- Profile auto-created via database trigger on signup (no extra frontend call). Function `handle_new_user()` revoked from PUBLIC, anon, and authenticated roles — only `service_role` via trigger.
- Sessions persist across page reloads.
- **Reports remain demonstrative only — no real legal analysis is implemented** (explicitly agreed constraint).
- TypeScript must pass cleanly; build verified after each significant change.

## Open questions & assumptions

- "Current plan" displayed in Settings is assumed to be a static/placeholder value — no billing or plan logic implemented yet.
- No password reset or email verification flow mentioned — may be needed.
- Document text extraction mechanism details not fully explored in this turn.