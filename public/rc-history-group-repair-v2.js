(() => {
  if (!/^\/rooms\//.test(window.location.pathname)) return;

  const groupKey = `royalcommand:chat-groups:${window.location.pathname}`;
  const migrationKey = `royalcommand:chat-groups-repair-v2:${window.location.pathname}`;

  try {
    if (window.localStorage.getItem(migrationKey) === "1") return;

    // Legacy grouping could collapse many historical conversations under one root.
    // Exact historical New Chat boundaries were not persisted, so the safest
    // recovery is to show each legacy user turn separately once. From this point
    // forward rc-chat-thread-workflow groups turns by explicit New Chat sessions.
    window.localStorage.removeItem(groupKey);
    window.localStorage.setItem(migrationKey, "1");
  } catch {}
})();
