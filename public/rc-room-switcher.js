(() => {
  if (!/^\/rooms\/[^/]+\/?$/.test(window.location.pathname)) return;

  const STYLE_ID = "rc-room-switcher-style";
  const SWITCHER_ID = "rc-room-switcher";
  const currentRoomId = window.location.pathname.split("/").filter(Boolean).pop() || "";
  const PLACEHOLDER_ROOMS = [
    { name: "법률룸", template: "legal" },
    { name: "취미룸", template: "custom" },
    { name: "학습룸", template: "education" },
    { name: "기술룸", template: "technology" },
    { name: "사업룸", template: "business" },
    { name: "부동산룸", template: "realestate" },
    { name: "여행룸", template: "hotel" },
    { name: "문서룸", template: "custom" },
    { name: "프로젝트룸", template: "business" },
    { name: "상담룸", template: "consultation" },
    { name: "건강룸", template: "medical" },
    { name: "가족룸", template: "custom" },
    { name: "쇼핑룸", template: "retail" },
    { name: "아이디어룸", template: "custom" },
  ];

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${SWITCHER_ID} {
        display: grid !important;
        grid-template-columns: repeat(var(--rc-room-count, 1), minmax(0, 1fr)) !important;
        gap: 4px !important;
        width: min(calc(var(--rc-room-count, 1) * 72px), calc(100vw - 610px)) !important;
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
      #${SWITCHER_ID} .rc-room-switcher-placeholder {
        opacity: .34 !important;
        color: #e8dfcf !important;
        background: rgba(214, 200, 166, 0.10) !important;
        border-color: rgba(188, 174, 141, 0.50) !important;
        cursor: pointer !important;
        font-weight: 400 !important;
      }
      #${SWITCHER_ID} .rc-room-switcher-placeholder:hover {
        opacity: .62 !important;
        border-color: rgba(232,215,170,.78) !important;
        background: rgba(214,200,166,.18) !important;
      }
      .royal-room-main main > div.fixed:first-of-type > div:first-child > a[href="/dashboard"] {
        display: none !important;
      }
      @media (max-width: 1200px) {
        #${SWITCHER_ID} {
          width: min(calc(var(--rc-room-count, 1) * 72px), calc(100vw - 520px)) !important;
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
      if (title && dock.previousElementSibling !== title) title.insertAdjacentElement("afterend", dock);
    }

    const specialistRooms = rooms
      .filter((room) => room && room.id && room.name && room.status !== "archived")
      .filter((room) => String(room.name).trim().toLowerCase() !== "command room")
      .slice(0, 14);

    const actualRooms = specialistRooms.length
      ? specialistRooms
      : [{ id: currentRoomId, name: "회계룸 샘플", status: "active", sample: true }];

    const existingNames = new Set(actualRooms.map((room) => String(room.name || "").replace(/\s*샘플\s*$/u, "").trim()));
    const placeholders = PLACEHOLDER_ROOMS
      .filter((room) => !existingNames.has(room.name))
      .slice(0, Math.max(0, 14 - actualRooms.length))
      .map((room, index) => ({ id: `placeholder-${index}`, ...room, placeholder: true }));

    const visibleRooms = [...actualRooms, ...placeholders].slice(0, 14);
    dock.style.setProperty("--rc-room-count", String(Math.max(visibleRooms.length, 1)));
    dock.replaceChildren();

    let realIndex = 0;
    for (const room of visibleRooms) {
      const button = document.createElement("button");
      button.type = "button";
      const isReal = !room.placeholder && !room.sample;
      const tone = isReal ? ` rc-room-tone-${realIndex % 3}` : "";
      button.className = `rc-room-switcher-button${room.placeholder ? " rc-room-switcher-placeholder" : ""}${isReal ? " rc-room-switcher-real" : ""}${tone}`;
      button.textContent = String(room.name);
      button.title = room.placeholder ? `${room.name} 만들기` : room.sample ? "테스트용 샘플 룸" : String(room.name);

      if (isReal) {
        if (String(room.id) === currentRoomId) button.setAttribute("aria-current", "page");
        realIndex += 1;
      }

      if (room.placeholder) {
        button.addEventListener("click", () => {
          const url = new URL("/room-builder", window.location.origin);
          url.searchParams.set("template", String(room.template || "custom"));
          url.searchParams.set("name", String(room.name || "새 Room"));
          url.searchParams.set("returnRoom", currentRoomId);
          window.location.assign(url.toString());
        });
      } else {
        button.addEventListener("click", () => {
          const targetId = String(room.id || currentRoomId);
          if (!targetId || targetId === currentRoomId) return;
          window.location.assign(`/rooms/${encodeURIComponent(targetId)}`);
        });
      }
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
