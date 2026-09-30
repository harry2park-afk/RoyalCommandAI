# Full-width classroom split and lesson chooser

Owner explicitly requests exact desktop screen halves and a button-opened lesson list with number/title on separate lines, closing immediately on title selection. STANDARD; Codex Writer; review_rcv3 independent review passed. Existing classroom only; no route/form/account changes. Recovery: recovery/learning-half-screen-20260930 at 1e5bd46f.

The prior centered 1140px content area and full-width header prevented a viewport-wide split. Header, curriculum, assessment and sources now occupy the left 50%; the existing teacher and chat occupy the right 50%, from the top of the page. No grid gap, width or padding outside the two border-box columns. Mobile keeps teacher, chat, curriculum order.

Shared LearningLessonList now uses a native modal dialog, closed initially. The list button opens it. Sixty title buttons show number then title; selecting closes the dialog synchronously before invoking the existing voice lesson-start handler. Close and browser Escape remain available. Long titles truncate visually to retain two rows, with the full title in accessible button text and title attribute. Korean group titles and English source titles are complete. ja/zh/hi currently use translated current-day titles when present and English fallback elsewhere; not a fully translated catalog.

Verification: focused control test covers open, Close, all60 title/number callbacks and close-before-start order. Typecheck, component lint, toolbox gate and build checked during task. Independent review found no structural/draft blocker. Real browser rendering and physical device audio remain unverified; no browser-access bypass attempted. Existing completion, saved work, audio engine and navigation preserved.
