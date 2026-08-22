"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { ROOM_DIRECTORY } from "@/lib/rooms/directory";

const EXTRA_GAME_ROOMS = [
  { id: "hobby-room", label: "Hobby Room", ko: "취미룸", templateId: "custom" },
  { id: "chess-janggi", label: "Chess & Janggi", ko: "체스·장기", templateId: "custom" },
  { id: "baduk-go", label: "Baduk / Go", ko: "바둑", templateId: "custom" },
  { id: "board-games", label: "Board Games", ko: "보드게임", templateId: "custom" },
  { id: "video-games", label: "Video Games", ko: "비디오·온라인 게임", templateId: "custom" },
  { id: "pro-gaming-esports", label: "Pro Gaming & Esports", ko: "프로게임·e스포츠", templateId: "custom" },
] as const;

const ALL_ROOMS = [...ROOM_DIRECTORY, ...EXTRA_GAME_ROOMS];

type Category = {
  id: string;
  label: string;
  ko: string;
  icon: string;
  roomIds: string[];
};

const CATEGORIES: Category[] = [
  { id: "business", label: "Business & Office", ko: "사업·회사", icon: "💼", roomIds: ["business-operations", "executive-office", "customer-service", "reception", "sales", "hr-recruitment", "project-management", "crm-client-management", "billing-payments", "procurement", "consulting"] },
  { id: "legal-finance", label: "Legal, Finance & Compliance", ko: "법률·금융·규정", icon: "⚖️", roomIds: ["legal", "accounting-tax", "finance", "insurance", "immigration-visa", "patent-ip", "compliance-risk", "documents-contracts", "esign-approval", "personal-finance"] },
  { id: "property-home", label: "Property, Building & Home", ko: "부동산·건축·주택", icon: "🏠", roomIds: ["real-estate", "property-management", "construction-trades", "architecture-design", "dream-home-3d", "renovation-home-repair", "building-materials", "hardware-tools", "energy-solar"] },
  { id: "health-care", label: "Health & Care", ko: "의료·복지", icon: "🏥", roomIds: ["medical-clinic", "dental", "allied-health", "pharmacy", "mental-health", "aged-care", "disability-support", "pet-care"] },
  { id: "education-research", label: "Education & Research", ko: "교육·연구", icon: "🎓", roomIds: ["education", "ai-tutor", "university-research", "translation-languages", "research-intelligence", "personal-research"] },
  { id: "sports-lifestyle", label: "Sports, Games & Lifestyle", ko: "스포츠·게임·취미생활", icon: "🎮", roomIds: ["sports", "sports-club-team", "athlete-coach", "fitness-gym", "hobby-room", "chess-janggi", "baduk-go", "board-games", "video-games", "pro-gaming-esports", "music", "dance", "hobby", "gaming-esports", "events-wedding", "beauty-salon", "fashion"] },
  { id: "retail-food", label: "Retail, Food & Hospitality", ko: "판매·식품·숙박", icon: "🛍️", roomIds: ["retail", "online-store", "marketplace", "home-shopping", "restaurant-cafe", "food-grocery", "hotel-hospitality", "travel", "shopping-assistant"] },
  { id: "technology-ai", label: "Technology & AI", ko: "기술·AI", icon: "🤖", roomIds: ["it-software", "ai-automation", "cybersecurity", "telecom-phone", "electronics-appliances", "website-builder", "app-development", "coding-developer", "security-safety"] },
  { id: "industry-transport", label: "Industry, Transport & Resources", ko: "산업·운송·자원", icon: "🏭", roomIds: ["manufacturing", "transport-logistics", "automotive", "agriculture-farming", "greenhouse-horticulture", "inventory-warehouse"] },
  { id: "media-creative", label: "Media & Creative", ko: "미디어·콘텐츠", icon: "🎬", roomIds: ["marketing-media", "creative-studio", "photo-video", "creator-influencer", "news-current-affairs"] },
  { id: "government-global", label: "Government, Community & Global", ko: "정부·공공·국제", icon: "🌍", roomIds: ["government-public", "nonprofit-association", "community", "charity-social-support", "international-trade", "import-export", "emergency-disaster"] },
  { id: "personal-family", label: "Personal & Family", ko: "개인·가족", icon: "👨‍👩‍👧", roomIds: ["personal-assistant", "family", "career-job-search", "shopping-assistant", "personal-finance", "personal-research"] },
  { id: "space-future", label: "Space & Future", ko: "우주·미래기술", icon: "🚀", roomIds: ["space-services", "satellite-internet", "earth-observation", "space-research", "environment-sustainability", "energy-solar"] },
  { id: "custom", label: "Anything / Custom", ko: "맞춤형", icon: "✨", roomIds: ["custom"] },
];

const ROOM_BY_ID = new Map(ALL_ROOMS.map((room) => [room.id, room]));

export default function RoomDirectoryPicker() {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const clean = query.trim().toLowerCase();
  const selectedCategory = CATEGORIES.find((item) => item.id === categoryId) || null;

  const visibleRooms = useMemo(() => {
    if (clean) {
      return ALL_ROOMS.filter((room) => `${room.label} ${room.ko}`.toLowerCase().includes(clean));
    }
    if (!selectedCategory) return [];
    return selectedCategory.roomIds.map((id) => ROOM_BY_ID.get(id)).filter(Boolean) as typeof ALL_ROOMS;
  }, [clean, selectedCategory]);

  function chooseRoom(room: (typeof ALL_ROOMS)[number]) {
    const current = new URL(window.location.href);
    const returnRoom = current.searchParams.get("returnRoom") || "";
    const next = new URL("/room-builder", window.location.origin);
    next.searchParams.set("template", room.templateId);
    next.searchParams.set("name", room.label);
    next.searchParams.set("roomType", room.id);
    if (returnRoom) next.searchParams.set("returnRoom", returnRoom);
    window.location.assign(next.toString());
  }

  const showingRooms = Boolean(clean || selectedCategory);

  return (
    <aside className="fixed right-4 top-4 z-[240] hidden h-[calc(100dvh-32px)] w-[330px] flex-col overflow-hidden rounded-2xl border-2 border-[var(--gold)]/65 bg-[#07111f]/97 shadow-[0_20px_70px_rgba(0,0,0,.55)] backdrop-blur-md xl:flex">
      <div className="border-b border-white/10 p-3">
        <div className="text-sm font-semibold text-[var(--gold-soft)]">Room 찾기</div>
        <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">1단계에서 분야를 고르고, 2단계에서 원하는 Room을 바로 선택하세요.</p>
        <div className="relative mt-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rc-input !border-red-500/70 !pl-9 text-sm focus:!border-red-400"
            placeholder="Room 바로 검색: 취미, 장기, 바둑, 게임"
            aria-label="Room 검색"
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--muted)]">
          <span>전체 {ALL_ROOMS.length}개</span>
          {showingRooms ? <span>표시 {visibleRooms.length}개</span> : <span>14개 분야</span>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!showingRooms ? (
          <div>
            <div className="mb-2 px-2 text-[11px] font-semibold text-red-300">🔴 1단계 · 분야를 선택하세요</div>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className="min-h-[78px] rounded-xl border border-white/10 bg-black/15 p-2.5 text-left transition hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/10"
                >
                  <span className="text-lg">{category.icon}</span>
                  <span className="mt-1 block text-[11px] font-semibold leading-4 text-white">{category.label}</span>
                  <span className="block text-[10px] leading-4 text-[var(--muted)]">{category.ko}</span>
                  <span className="mt-1 block text-[9px] text-[var(--gold-soft)]">{category.roomIds.length} Rooms</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="sticky top-0 z-10 mb-2 flex items-center justify-between rounded-xl border border-white/10 bg-[#07111f]/95 px-2 py-2 backdrop-blur">
              <button
                type="button"
                onClick={() => { setCategoryId(null); setQuery(""); }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[var(--gold-soft)] hover:bg-white/5"
              >
                <ArrowLeft size={13} /> 분야로 돌아가기
              </button>
              <span className="text-[10px] text-[var(--muted)]">2단계 · Room 선택</span>
            </div>

            {selectedCategory && !clean ? (
              <div className="mb-2 rounded-xl border border-[var(--gold)]/25 bg-[var(--gold)]/5 px-3 py-2">
                <div className="text-xs font-semibold text-[var(--gold-soft)]">{selectedCategory.icon} {selectedCategory.label}</div>
                <div className="text-[10px] text-[var(--muted)]">{selectedCategory.ko}</div>
              </div>
            ) : null}

            <div className="space-y-1">
              {visibleRooms.map((room, index) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => chooseRoom(room)}
                  className="flex w-full items-start gap-2 rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-left transition hover:border-[var(--gold)]/55 hover:bg-[var(--gold)]/10"
                  title={`${room.label} / ${room.ko}`}
                >
                  <span className="w-6 shrink-0 text-right text-[10px] text-[var(--muted)]">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-white">{room.label}</span>
                    <span className="mt-0.5 block text-[10px] text-[var(--muted)]">{room.ko}</span>
                  </span>
                  <span className="shrink-0 text-[10px] text-[var(--gold-soft)]">선택 ›</span>
                </button>
              ))}
              {!visibleRooms.length ? <div className="px-3 py-6 text-center text-xs text-[var(--muted)]">찾는 Room이 없습니다. Anything / Custom Room을 선택하세요.</div> : null}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
