(() => {
  if (!/^\/rooms\/[^/]+\/?$/.test(window.location.pathname)) return;

  const STYLE_ID = "rc-room-switcher-style";
  const SWITCHER_ID = "rc-room-switcher";
  const FINDER_ID = "rc-room-finder-top";
  const currentRoomId = window.location.pathname.split("/").filter(Boolean).pop() || "";

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${SWITCHER_ID} {
        display: grid !important;
        grid-template-columns: repeat(var(--rc-room-count, 1), minmax(0, 1fr)) !important;
        gap: 4px !important;
        width: min(calc(var(--rc-room-count, 1) * 72px), calc(100vw - 720px)) !important;
        min-width: 0 !important;
        margin-left: 14px !important;
        margin-right: 8px !important;
        align-items: center !important;
        flex: 0 1 auto !important;
      }
      #${SWITCHER_ID} .rc-room-switcher-button {
        height: 30px !important;
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        border: 1px solid #bcae8d !important;
        border-radius: 6px !important;
        padding: 0 8px !important;
        font-family: "Times New Roman", Times, serif !important;
        font-size: clamp(9px, 0.72vw, 12px) !important;
        font-weight: 600 !important;
        line-height: 28px !important;
        text-align: center !important;
        cursor: pointer !important;
        transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease !important;
      }
      #${SWITCHER_ID} .rc-room-switcher-real {
        color: #fff8e7 !important;
        text-shadow: 0 1px 1px rgba(0,0,0,.55) !important;
      }
      #${SWITCHER_ID} .rc-room-tone-0 {
        border-color: #e2bd4f !important;
        background: linear-gradient(135deg, #7b5a08 0%, #c79d27 48%, #664600 100%) !important;
        box-shadow: inset 0 0 8px rgba(255,239,170,.28), 0 0 8px rgba(212,175,55,.20) !important;
      }
      #${SWITCHER_ID} .rc-room-tone-1 {
        border-color: #d36b78 !important;
        background: linear-gradient(135deg, #681428 0%, #a52842 52%, #50101f 100%) !important;
        box-shadow: inset 0 0 8px rgba(255,180,190,.18), 0 0 8px rgba(160,30,60,.18) !important;
      }
      #${SWITCHER_ID} .rc-room-tone-2 {
        border-color: #6f9ddd !important;
        background: linear-gradient(135deg, #173b70 0%, #245ca5 52%, #102f5b 100%) !important;
        box-shadow: inset 0 0 8px rgba(180,215,255,.18), 0 0 8px rgba(40,100,180,.18) !important;
      }
      #${SWITCHER_ID} .rc-room-switcher-real:hover {
        transform: translateY(-1px) !important;
        border-color: #ffe38a !important;
        box-shadow: inset 0 0 10px rgba(255,255,255,.18), 0 0 11px rgba(212,175,55,.26) !important;
      }
      #${SWITCHER_ID} .rc-room-switcher-real[aria-current="page"] {
        outline: 1px solid rgba(255,225,120,.7) !important;
        outline-offset: 1px !important;
      }
      #${FINDER_ID} {
        flex: 0 0 112px !important;
        width: 112px !important;
        height: 30px !important;
        margin-right: 8px !important;
        border: 1px solid #d9b44a !important;
        border-radius: 6px !important;
        background: #7A0C2E !important;
        color: #fff4c2 !important;
        font-family: "Times New Roman", Times, serif !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        line-height: 28px !important;
        text-align: center !important;
        white-space: nowrap !important;
        cursor: pointer !important;
        box-shadow: 0 0 8px rgba(217,180,74,.28) !important;
      }
      #${FINDER_ID}:hover {
        background: #94113a !important;
        border-color: #ffe38a !important;
      }
      .royal-room-main main > div.fixed:first-of-type > div:first-child > a[href="/dashboard"] {
        display: none !important;
      }
      @media (max-width: 1200px) {
        #${SWITCHER_ID} {
          width: min(calc(var(--rc-room-count, 1) * 72px), calc(100vw - 620px)) !important;
          gap: 2px !important;
          margin-left: 6px !important;
          margin-right: 4px !important;
        }
        #${SWITCHER_ID} .rc-room-switcher-button {
          height: 28px !important;
          line-height: 26px !important;
          padding: 0 4px !important;
          font-size: 9px !important;
        }
        #${FINDER_ID} {
          flex-basis: 96px !important;
          width: 96px !important;
          height: 28px !important;
          line-height: 26px !important;
          font-size: 9px !important;
          margin-right: 4px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function findHeaderRow() {
    return document.querySelector(".royal-room-main main > div.fixed:first-of-type > div:first-child");
  }

  function ensureFinder(header, dock) {
    let finder = document.getElementById(FINDER_ID);
    if (!(finder instanceof HTMLButtonElement)) {
      finder = document.createElement("button");
      finder.id = FINDER_ID;
      finder.type = "button";
      finder.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("rc:open-room-finder"));
      });
    }
    finder.textContent = "+ Build Your Room";
    finder.title = "Build Your Room";
    if (dock.nextElementSibling !== finder) dock.insertAdjacentElement("afterend", finder);
  }

  function mount(rooms) {
    const header = findHeaderRow();
    if (!(header instanceof HTMLElement)) return false;

    installStyle();
    const dashboard = header.querySelector('a[href="/dashboard"]');
    if (dashboard instanceof HTMLElement) dashboard.style.display = "none";

    let dock = document.getElementById(SWITCHER_ID);
    if (!(dock instanceof HTMLElement)) {
      dock = document.createElement("div");
      dock.id = SWITCHER_ID;
      const title = header.querySelector("h1");
      if (title) title.insertAdjacentElement("afterend", dock);
      else header.insertBefore(dock, header.firstChild);
    } else {
      const title = header.querySelector("h1");
      if (title && dock.previousElementSibling !== title) title.insertAdjacentElement("afterend", dock);
    }

    const visibleRooms = rooms
      .filter((room) => room && room.id && room.name && room.status !== "archived")
      .filter((room) => String(room.name).trim().toLowerCase() !== "command room")
      .slice(0, 14);

    dock.style.setProperty("--rc-room-count", String(Math.max(visibleRooms.length, 1)));
    dock.replaceChildren();

    visibleRooms.forEach((room, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `rc-room-switcher-button rc-room-switcher-real rc-room-tone-${index % 3}`;
      button.textContent = String(room.name);
      button.title = String(room.name);
      if (String(room.id) === currentRoomId) button.setAttribute("aria-current", "page");
      button.addEventListener("click", () => {
        const targetId = String(room.id || "");
        if (!targetId || targetId === currentRoomId) return;
        window.location.assign(`/rooms/${encodeURIComponent(targetId)}`);
      });
      dock.appendChild(button);
    });

    ensureFinder(header, dock);
    dock.style.display = visibleRooms.length ? "grid" : "none";
    return true;
  }

  async function load() {
    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      const rooms = Array.isArray(payload?.rooms) ? payload.rooms : [];

      if (mount(rooms)) return;
      let tries = 0;
      const timer = window.setInterval(() => {
        tries += 1;
        if (mount(rooms) || tries >= 20) window.clearInterval(timer);
      }, 150);
    } catch {}
  }

  void load();
})();
