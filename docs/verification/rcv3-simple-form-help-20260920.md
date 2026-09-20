# Simple Create Room and shared explanation translation

STANDARD UI work; root sole writer, independent help/privacy reviewer. Continuing Owner authorization covers Preview changes. No Production promotion or payment/account-connection changes.

Existing purpose selection implementation (7157b88, 2026-09-19) remains authoritative: `changePurpose` resets purpose-specific answers/tasks and existing field definitions drive questions. No duplicate form engine or new room-purpose schema.

- Room Name and Purpose appear first. Fresh forms ask the customer to select a purpose; numbered catalogue labels removed, common purposes shown first. Personal/Other uses the existing custom purpose.
- Saved forms are collapsed below the working form. Additional AI options are collapsed; current selections remain visible. Mobile header uses explicit grid rows and fields shrink to available width.
- Shared HelpText and root HelpTranslationProvider provide English-first explanations with Translate/English toggles. Adopted in RC V3 form/checkout guidance, dashboard room directory, existing Create Room account information and service selection guidance. The shared component is available to all RC routes. Unrelated old paragraphs are not automatically scraped or translated.
- Translation accepts a registered public help ID only. Authenticated profile determines language (profile account language, then signup language; display uiLocale is independent); browser language and client-supplied target language are not used. Account/profile lookup is owner-scoped. Customer text, email contents, files and contract bodies are never included.
- Korean registered guidance uses reviewed local strings; other languages use one configured AI provider, bounded output, best-effort per-instance request limits and bounded public-text cache. Failure retains English and allows retry. Language-save event clears stale translations after preferences persist.

Validation: 20 focused tests passed for existing form data behavior, locale resources and new translation API authorization/public-text boundary. Next.js production build passed. Independent review: no blockers. Preview visual/interaction verification recorded in the task run. Do not claim physical handset testing where only the cloud browser was available.

Rollback: application source 7606b3a6cc9e023aacfd5f86ba9b2822b2bc03d4. No database migration or customer data deletion in this change.

Live first-pass inspection caught global absolute-positioned h1 interference and a profile/UI-locale mismatch (signup/account Korean, display English). Fixed by scoped header title reset and account-language precedence. Both remain isolated from customer account settings; no language preferences were changed.
