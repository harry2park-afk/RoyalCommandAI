(() => {
  function clearLegacyRightState() {
    document.documentElement.dataset.rcRightCollapsed = "0";

    const legacy = document.getElementById("rc-right-edge-toggle");
    if (legacy instanceof HTMLElement) {
      legacy.style.setProperty("display", "none", "important");
      legacy.style.setProperty("pointer-events", "none", "important");
    }

    const textarea = document.querySelector('textarea[placeholder*="Royal Command"]');
    if (!(textarea instanceof HTMLTextAreaElement)) return;

    const section = textarea.closest("section");
    const grid = section?.parentElement;
    const aside = grid instanceof HTMLElement
      ? [...grid.children].find((el) => el.tagName === "ASIDE")
      : null;

    if (grid instanceof HTMLElement) {
      ["grid-template-columns", "gap", "width", "max-width"].forEach((p) =>
        grid.style.removeProperty(p),
      );
    }

    if (section instanceof HTMLElement) {
      ["width", "max-width", "min-width"].forEach((p) => section.style.removeProperty(p));
    }

    if (aside instanceof HTMLElement) {
      ["display", "width", "min-width", "max-width", "overflow", "padding", "margin"].forEach((p) =>
        aside.style.removeProperty(p),
      );
    }
  }

  clearLegacyRightState();

  const observer = new MutationObserver(() => {
    requestAnimationFrame(clearLegacyRightState);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
