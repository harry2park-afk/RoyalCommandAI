# Learning course language rollout — phase 1

Harry approved Korean-only course UI and English/Japanese/Chinese/Indian versions on 2026-09-29. Chinese interpreted as Simplified Chinese; Indian interpreted as Hindi, not all languages of India. STANDARD scoped learning changes, single writer + independent read-only review. Preview only. Recovery tag: recovery/learning-languages-20260929.

Reuses existing 100 lessons, question IDs, original answer indices, learning toolbox, connector registry, account language, durable daily AI quota and server grading. Adds complete five-language interface/certificate message catalog. Korean/English lesson content uses existing authored translations directly. Other three languages are on-demand machine translations of server-owned public catalog strings, not 300 pre-reviewed static lessons. Authenticated translation endpoint accepts only day and supported language; existing origin/input validation applies. User artifacts, conversation, answer keys and credentials never enter shared translation cache. Uncached batches reserve existing daily AI quota; UI guidance discloses this. Cached content is keyed by course, language, key and source hash.

Course selector uses a scoped language query and does not overwrite account language. Tutor/project requests receive the supported selected course language. Course, progress, submitted work and unsent drafts keep their existing identities across languages. Customer-authored text and existing feedback are not silently rewritten.

Exam questions translate before a new attempt timer starts. Resumed attempts retain original expiry, compute serverNow after translation and never alter grading indices. Missing/invalid translations produce localized failure/retry, not a silent English fallback. Translation can still change nuance; semantic validation across all lessons remains outstanding.

Evidence: 35 focused tests plus 2 additional full-render language tests passed, production build (including TypeScript), toolbox inventory and whitespace check passed. Independent review found no remaining material blocker after correcting Question import and resumed-exam clock ordering.

Not verified: signed-in live browser language switching, live provider translation results, linguistic accuracy of every Japanese/Chinese/Hindi lesson or exam. No Production/master, billing, database or live user-state mutation.
