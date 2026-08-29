(() => {
  if (!/^\/rooms\/[^/]+\/?$/.test(window.location.pathname)) return;

  const STYLE_ID = "rc-room-switcher-style";
  const SWITCHER_ID = "rc-room-switcher";
  const COUNTRY_ID = "rc-country-shortcut";
  const FINDER_ID = "rc-room-finder-top";
  const currentRoomId = window.location.pathname.split("/").filter(Boolean).pop() || "";

  const isCountryRoom = (room) => {
    const name = String(room?.name || "").trim().toLowerCase();
    return name === "australia" || name.startsWith("australia ") || name === "australian";
  };

  const isLegalRoom = (room) => {
    const name = String(room?.name || "").trim().toLowerCase();
    const description = String(room?.description || "").trim().toLowerCase();
    return name.includes("법률") || name.includes("legal") || description.startsWith("legal office");
  };

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .royal-room-main main > div.fixed:first-of-type > div:first-child { position: relative !important; }
      #${COUNTRY_ID} {
        flex:0 0 205px !important; width:205px !important; min-width:205px !important; max-width:205px !important; height:34px !important;
        margin-left:10px !important; padding:0 14px !important; overflow:hidden !important; text-overflow:ellipsis !important;
        white-space:nowrap !important; border:1px solid #e2bd4f !important; border-radius:6px !important;
        background:linear-gradient(135deg,#7b5a08 0%,#c79d27 48%,#664600 100%) !important; color:#fff8e7 !important;
        font:700 18px/32px "Times New Roman",Times,serif !important; text-align:center !important; cursor:pointer !important;
        box-shadow:inset 0 0 8px rgba(255,239,170,.28),0 0 8px rgba(212,175,55,.20) !important;
      }
      #${SWITCHER_ID} {
        position:absolute !important; left:53% !important; top:50% !important; transform:translate(-50%,-50%) !important;
        display:grid !important; grid-template-columns:repeat(var(--rc-room-count,1),minmax(190px,220px)) !important;
        justify-content:center !important; gap:8px !important;
        width:min(calc(var(--rc-room-count,1) * 228px),calc(100vw - 650px)) !important;
        min-width:0 !important; margin:0 !important; align-items:center !important; z-index:12 !important;
      }
      #${SWITCHER_ID} .rc-room-switcher-button {
        height:32px !important; min-width:190px !important; max-width:220px !important; overflow:hidden !important;
        text-overflow:ellipsis !important; white-space:nowrap !important; border:1px solid #bcae8d !important;
        border-radius:6px !important; padding:0 14px !important; font-family:"Times New Roman",Times,serif !important;
        font-size:13px !important; font-weight:700 !important; line-height:30px !important; text-align:center !important;
        cursor:pointer !important; color:#fff8e7 !important; text-shadow:0 1px 1px rgba(0,0,0,.55) !important;
      }
      #${SWITCHER_ID} .rc-room-tone-0 { border-color:#d36b78 !important; background:linear-gradient(135deg,#681428 0%,#a52842 52%,#50101f 100%) !important; }
      #${SWITCHER_ID} .rc-room-tone-1,
      #${SWITCHER_ID} .rc-room-legal { border-color:#6f9ddd !important; background:linear-gradient(135deg,#173b70 0%,#245ca5 52%,#102f5b 100%) !important; }
      #${SWITCHER_ID} .rc-room-tone-2 { border-color:#a98ed6 !important; background:linear-gradient(135deg,#3c245f 0%,#65439a 52%,#2b1948 100%) !important; }
      #${SWITCHER_ID} .rc-room-switcher-real[aria-current="page"] { outline:2px solid rgba(255,225,120,.85) !important; outline-offset:1px !important; }
      #${FINDER_ID} { flex:0 0 112px !important; width:112px !important; height:30px !important; margin-left:auto !important; margin-right:72px !important; border:1px solid #d9b44a !important; border-radius:6px !important; background:#7A0C2E !important; color:#fff4c2 !important; font:700 11px/28px "Times New Roman",Times,serif !important; text-align:center !important; white-space:nowrap !important; cursor:pointer !important; }
      .royal-room-main main > div.fixed:first-of-type > div:first-child > a[href="/dashboard"] { display:none !important; }
      @media (max-width:1200px) {
        #${COUNTRY_ID} { flex-basis:120px !important; width:120px !important; min-width:120px !important; max-width:120px !important; height:30px !important; font-size:12px !important; line-height:28px !important; margin-left:4px !important; padding:0 6px !important; }
        #${SWITCHER_ID} { grid-template-columns:repeat(var(--rc-room-count,1),minmax(90px,120px)) !important; width:min(calc(var(--rc-room-count,1) * 124px),calc(100vw - 430px)) !important; gap:3px !important; }
        #${SWITCHER_ID} .rc-room-switcher-button { min-width:90px !important; max-width:120px !important; height:28px !important; line-height:26px !important; padding:0 5px !important; font-size:10px !important; }
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
      finder = document.createElement("button"); finder.id = FINDER_ID; finder.type = "button";
      finder.addEventListener("click", () => window.dispatchEvent(new CustomEvent("rc:open-room-finder")));
    }
    finder.textContent = "+ Build Your Room"; finder.title = "Build Your Room";
    if (dock.nextElementSibling !== finder) dock.insertAdjacentElement("afterend", finder);
  }

  function mountCountry(header, countryRoom) {
    let button = document.getElementById(COUNTRY_ID);
    if (!countryRoom) { button?.remove(); return; }
    if (!(button instanceof HTMLButtonElement)) {
      button = document.createElement("button"); button.id = COUNTRY_ID; button.type = "button";
    }
    button.textContent = String(countryRoom.name || "Australia");
    button.title = "Country · change from Settings";
    button.onclick = () => {
      const targetId = String(countryRoom.id || "");
      if (targetId && targetId !== currentRoomId) window.location.assign(`/rooms/${encodeURIComponent(targetId)}`);
    };
    const title = header.querySelector("h1");
    if (title && button.previousElementSibling !== title) title.insertAdjacentElement("afterend", button);
  }

  function mount(rooms) {
    const header = findHeaderRow();
    if (!(header instanceof HTMLElement)) return false;
    installStyle();

    const active = rooms.filter((room) => room && room.id && room.name && room.status !== "archived");
    const countryRoom = active.find(isCountryRoom) || null;
    mountCountry(header, countryRoom);

    let dock = document.getElementById(SWITCHER_ID);
    if (!(dock instanceof HTMLElement)) { dock = document.createElement("div"); dock.id = SWITCHER_ID; header.appendChild(dock); }

    const visibleRooms = active
      .filter((room) => !isCountryRoom(room))
      .filter((room) => String(room.name).trim().toLowerCase() !== "command room")
      .slice(0, 12);

    dock.style.setProperty("--rc-room-count", String(Math.max(visibleRooms.length, 1)));
    dock.replaceChildren();

    visibleRooms.forEach((room, index) => {
      const button = document.createElement("button");
      button.type = "button";
      const toneClass = isLegalRoom(room) ? "rc-room-legal" : `rc-room-tone-${index % 3}`;
      button.className = `rc-room-switcher-button rc-room-switcher-real ${toneClass}`;
      button.textContent = String(room.name); button.title = String(room.name); button.dataset.roomId = String(room.id);
      if (String(room.id) === currentRoomId) button.setAttribute("aria-current", "page");
      button.addEventListener("click", () => {
        const targetId = String(room.id || "");
        if (targetId && targetId !== currentRoomId) window.location.assign(`/rooms/${encodeURIComponent(targetId)}`);
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
      const timer = setInterval(() => { tries += 1; if (mount(rooms) || tries >= 20) clearInterval(timer); }, 150);
    } catch {}
  }

  void load();
})();