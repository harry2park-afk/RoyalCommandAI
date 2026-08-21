(() => {
  if (!/^\/rooms\/[^/]+\/?$/.test(window.location.pathname)) return;

  const STYLE_ID = "rc-room-switcher-style";
  const SWITCHER_ID = "rc-room-switcher";
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
        width: min(calc(var(--rc-room-count, 1) * 150px), 720px, 54vw) !important;
        min-width: 0 !important;
        margin-left: 14px !important;
        margin-right: 10px !important;
        align-items: center !important;
        flex: 0 1 auto !important;
      }
      #${SWITCHER_ID} .rc-room-switcher-button {
        height: 30px !important;
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        border: 1px solid #2A3B6E !important;
        border-radius: 6px !important;
        background: #0b1524 !important;
        color: #f4f0e7 !important;
        padding: 0 8px !important;
        font-family: "Times New Roman", serif !important;
        font-size: clamp(9px, 0.72vw, 12px) !important;
        font-weight: 600 !important;
        line-height: 28px !important;
        text-align: center !important;
        cursor: pointer !important;
      }
      #${SWITCHER_ID} .rc-room-switcher-button:hover {
        border-color: #FFD700 !important;
        color: #FFD700 !important;
        background: rgba(255,215,0,.07) !important;
      }
      #${SWITCHER_ID} .rc-room-switcher-button[aria-current="page"] {
        border-color: #FFD700 !important;
        color: #FFD700 !important;
        background: rgba(255,215,0,.12) !important;
        box-shadow: inset 0 0 0 1px rgba(255,215,0,.15) !important;
      }
      .royal-room-main main > div.fixed:first-of-type > div:first-child > a[href="/dashboard"] {
        display: none !important;
      }
      @media (max-width: 1200px) {
        #${SWITCHER_ID} {
          width: min(calc(var(--rc-room-count, 1) * 92px), 46vw) !important;
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
      }
    `;
    document.head.appendChild(style);
  }

  function findHeaderRow() {
    return document.querySelector(".royal-room-main main > div.fixed:first-of-type > div:first-child");
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
      if (title && dock.previousElementSibling !== title) {
        title.insertAdjacentElement("afterend", dock);
      }
    }

    const specialistRooms = rooms
      .filter((room) => room && room.id && room.name && room.status !== "archived")
      .filter((room) => String(room.name).trim().toLowerCase() !== "command room")
      .slice(0, 12);

    const visibleRooms = specialistRooms.length
      ? specialistRooms
      : [{ id: currentRoomId, name: "회계룸 샘플", status: "active", sample: true }];

    dock.style.setProperty("--rc-room-count", String(Math.max(visibleRooms.length, 1)));
    dock.replaceChildren();

    for (const room of visibleRooms) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rc-room-switcher-button";
      button.textContent = String(room.name);
      button.title = room.sample ? "테스트용 샘플 룸" : String(room.name);
      if (!room.sample && String(room.id) === currentRoomId) button.setAttribute("aria-current", "page");
      button.addEventListener("click", () => {
        const targetId = String(room.id || currentRoomId);
        if (!targetId) return;
        if (targetId === currentRoomId) return;
        window.location.assign(`/rooms/${encodeURIComponent(targetId)}`);
      });
      dock.appendChild(button);
    }

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
