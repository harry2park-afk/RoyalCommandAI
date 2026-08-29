(() => {
  if (!/^\/rooms\/[^/]+\/?$/.test(window.location.pathname)) return;

  const MANAGER_ID = "rc-room-shortcut-manager";
  const MODAL_ID = "rc-room-manager-modal";
  const STORAGE_KEY = "royalcommand:hidden-room-ids";
  const currentRoomId = window.location.pathname.split("/").filter(Boolean).pop() || "";
  let rooms = [];
  let hiddenIds = new Set();

  const isCountryRoom = (room) => {
    const name = String(room?.name || "").trim().toLowerCase();
    return name === "australia" || name.startsWith("australia ") || name === "australian";
  };

  function specialistRooms() {
    return rooms
      .filter((room) => room && room.id && room.name && room.status !== "archived")
      .filter((room) => !isCountryRoom(room))
      .filter((room) => String(room.name).trim().toLowerCase() !== "command room");
  }

  function localHidden() {
    try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(value) ? value.filter((id) => typeof id === "string") : []; }
    catch { return []; }
  }

  function saveLocal() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...hiddenIds])); } catch {} }
  async function saveHidden() {
    saveLocal();
    try { await fetch("/api/user/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hiddenRoomIds: [...hiddenIds] }) }); }
    catch {}
  }

  function applyHidden() {
    const dock = document.getElementById("rc-room-switcher");
    if (!(dock instanceof HTMLElement)) return;
    const actual = specialistRooms().slice(0, 12);
    const byId = new Map(actual.map((room) => [String(room.id), room]));
    for (const button of dock.querySelectorAll(".rc-room-switcher-button")) {
      if (!(button instanceof HTMLElement)) continue;
      const id = button.dataset.roomId || "";
      if (!id || !byId.has(id)) continue;
      button.style.display = hiddenIds.has(id) ? "none" : "";
    }
    const visibleCount = actual.filter((room) => !hiddenIds.has(String(room.id))).length;
    dock.style.setProperty("--rc-room-count", String(Math.max(visibleCount, 1)));
    dock.style.display = visibleCount ? "grid" : "none";
  }

  function ensureManagerButton() {
    if (document.getElementById(MANAGER_ID)) return;
    const dock = document.getElementById("rc-room-switcher");
    const header = document.querySelector(".royal-room-main main > div.fixed:first-of-type > div:first-child");
    if (!(header instanceof HTMLElement)) return;
    const button = document.createElement("button");
    button.id = MANAGER_ID; button.type = "button"; button.textContent = "⋯"; button.title = "룸 관리"; button.setAttribute("aria-label", "룸 관리");
    button.style.cssText = "flex:0 0 30px;width:30px;height:30px;margin-left:4px;border:1px solid #bcae8d;border-radius:6px;background:rgba(214,200,166,.24);color:#fffaf0;font:700 18px/26px 'Times New Roman',Times,serif;cursor:pointer;";
    button.addEventListener("click", openManager);
    if (dock instanceof HTMLElement) dock.insertAdjacentElement("afterend", button); else header.appendChild(button);
  }

  function closeManager() { document.getElementById(MODAL_ID)?.remove(); }
  function rowButton(label, action, danger = false) {
    const button = document.createElement("button"); button.type = "button"; button.textContent = label;
    button.style.cssText = `height:28px;padding:0 8px;border:1px solid ${danger ? "rgba(255,90,90,.55)" : "#bcae8d"};border-radius:5px;background:${danger ? "rgba(130,25,25,.18)" : "rgba(214,200,166,.18)"};color:${danger ? "#ffb4b4" : "#fffaf0"};font:600 11px/26px 'Times New Roman',Times,serif;cursor:pointer;white-space:nowrap;`;
    button.addEventListener("click", action); return button;
  }

  async function renameRoom(room) {
    const next = window.prompt("새 Room 이름을 입력하세요.", String(room.name || ""));
    if (next == null) return;
    const name = next.trim().slice(0, 120); if (!name || name === room.name) return;
    const response = await fetch(`/api/rooms/${encodeURIComponent(String(room.id))}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (!response.ok) { window.alert("Room 이름을 변경하지 못했습니다."); return; }
    window.location.reload();
  }

  async function toggleHidden(room) {
    const id = String(room.id); if (hiddenIds.has(id)) hiddenIds.delete(id); else hiddenIds.add(id);
    await saveHidden(); applyHidden(); closeManager(); openManager();
  }

  async function deleteRoom(room) {
    const name = String(room.name || "Room");
    if (!window.confirm(`'${name}'을(를) 삭제하시겠습니까?\n이 Room의 대화와 자료도 함께 삭제됩니다.`)) return;
    const response = await fetch(`/api/rooms/${encodeURIComponent(String(room.id))}`, { method: "DELETE" });
    if (!response.ok) { window.alert("Room을 삭제하지 못했습니다."); return; }
    hiddenIds.delete(String(room.id)); await saveHidden();
    if (String(room.id) === currentRoomId) {
      const remaining = specialistRooms().find((item) => String(item.id) !== String(room.id));
      if (remaining?.id) window.location.assign(`/rooms/${encodeURIComponent(String(remaining.id))}`); else window.location.assign("/dashboard");
      return;
    }
    window.location.reload();
  }

  function openManager() {
    closeManager();
    const overlay = document.createElement("div"); overlay.id = MODAL_ID;
    overlay.style.cssText = "position:fixed;inset:0;z-index:1000002;display:flex;align-items:flex-start;justify-content:center;padding-top:70px;background:rgba(0,0,0,.55);";
    overlay.addEventListener("click", (event) => { if (event.target === overlay) closeManager(); });
    const panel = document.createElement("div"); panel.style.cssText = "width:min(680px,92vw);max-height:76vh;overflow:auto;border:1px solid #bcae8d;border-radius:12px;background:#17231f;padding:12px;box-shadow:0 18px 50px rgba(0,0,0,.5);font-family:'Times New Roman',Times,serif;";
    const top = document.createElement("div"); top.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;";
    const title = document.createElement("div"); title.textContent = "Room 관리"; title.style.cssText = "font:700 18px/1.2 'Times New Roman',Times,serif;color:#fffaf0;";
    top.append(title, rowButton("닫기", closeManager)); panel.appendChild(top);

    for (const room of specialistRooms()) {
      const row = document.createElement("div"); row.style.cssText = "display:grid;grid-template-columns:minmax(160px,1fr) auto;gap:10px;align-items:center;padding:8px 4px;border-top:1px solid rgba(214,200,166,.18);";
      const info = document.createElement("div"); info.textContent = String(room.name); info.style.cssText = "min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fffaf0;font-size:13px;font-weight:700;";
      const actions = document.createElement("div"); actions.style.cssText = "display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;";
      actions.append(rowButton("열기", () => window.location.assign(`/rooms/${encodeURIComponent(String(room.id))}`)), rowButton("이름변경", () => void renameRoom(room)), rowButton(hiddenIds.has(String(room.id)) ? "표시" : "숨김", () => void toggleHidden(room)), rowButton("삭제", () => void deleteRoom(room), true));
      row.append(info, actions); panel.appendChild(row);
    }

    const note = document.createElement("div"); note.textContent = "국가(Australia)는 Room 관리 대상이 아닙니다. 국가 변경은 별도 설정에서만 하도록 보호됩니다.";
    note.style.cssText = "margin-top:10px;padding-top:8px;border-top:1px solid rgba(214,200,166,.18);color:#cfc6b3;font-size:10px;";
    panel.appendChild(note); overlay.appendChild(panel); document.body.appendChild(overlay);
  }

  async function load() {
    try {
      const [roomsResponse, prefResponse] = await Promise.all([fetch("/api/rooms", { cache: "no-store" }), fetch("/api/user/preferences", { cache: "no-store" })]);
      const roomPayload = await roomsResponse.json().catch(() => ({})); const prefPayload = await prefResponse.json().catch(() => ({}));
      rooms = Array.isArray(roomPayload?.rooms) ? roomPayload.rooms : [];
      const serverHidden = Array.isArray(prefPayload?.preferences?.hiddenRoomIds) ? prefPayload.preferences.hiddenRoomIds.filter((id) => typeof id === "string") : [];
      hiddenIds = new Set(serverHidden.length ? serverHidden : localHidden()); saveLocal();
      let tries = 0; const timer = setInterval(() => { tries += 1; applyHidden(); ensureManagerButton(); if ((document.getElementById("rc-room-switcher") && document.getElementById(MANAGER_ID)) || tries >= 30) clearInterval(timer); }, 120);
    } catch {}
  }

  void load();
})();