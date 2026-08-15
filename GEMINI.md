# Royal Command — Gemini Worker Rules

You are working only on the `gemini-worker` branch of `harry2park-afk/RoyalCommandAI`.

## Safety boundary
- NEVER push directly to `master`.
- NEVER deploy or promote Production.
- NEVER change domains, billing, secrets, auth providers, Supabase production data, or production environment variables.
- NEVER delete user data or rooms.
- Do not add broad DOM MutationObservers or runtime scripts that rewrite React UI after render.
- Prefer direct React/Next.js code changes and small, reviewable commits.

## Required workflow
1. Inspect the existing implementation before editing.
2. Make the smallest change required.
3. Run/build/test locally when tools are available.
4. Commit only to `gemini-worker` with a clear message.
5. Let Vercel create a Preview deployment from this branch.
6. Report exact changed files, commit SHA, test results, and Preview deployment status/URL if available.
7. Stop before Production. Harry/ChatGPT will review and promote separately.

## Current priority
Improve Royal Command Room reliability and observability without redesigning the UI. Focus on detecting and diagnosing blank-white-screen/client crashes, chat failures, provider failures, request tracing, and safe error recovery.

## Evidence rule
Never claim work is complete unless you can provide the real file paths and commit SHA. Never claim Production deployment unless you have an actual Production deployment ID and were explicitly authorized to promote it.