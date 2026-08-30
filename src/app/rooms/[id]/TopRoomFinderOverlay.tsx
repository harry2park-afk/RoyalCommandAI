"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { useParams } from "next/navigation";
import { ROOM_DIRECTORY, type RoomDirectoryItem } from "@/lib/rooms/directory";

const EXTRA_ROOMS: RoomDirectoryItem[] = [
  { id: "hobby-room", label: "Hobby Room", ko: "취미룸", templateId: "custom" },
  { id: "chess-janggi", label: "Chess & Janggi", ko: "체스·장기", templateId: "custom" },
  { id: "baduk-go", label: "Baduk / Go", ko: "바둑", templateId: "custom" },
  { id: "board-games", label: "Board Games", ko: "보드게임", templateId: "custom" },
  { id: "video-games", label: "Video Games", ko: "비디오·온라인 게임", templateId: "custom" },
  { id: "pro-gaming-esports", label: "Pro Gaming & Esports", ko: "프로게임·e스포츠", templateId: "custom" },
  { id: "gym-fitness-center", label: "Gym & Fitness Center", ko: "짐·헬스클럽", templateId: "fitness" },
  { id: "hang-gliding", label: "Hang Gliding", ko: "행글라이딩", templateId: "fitness" },
  { id: "paragliding", label: "Paragliding", ko: "패러글라이딩", templateId: "fitness" },
  { id: "marine-water-sports", label: "Advanced Marine & Water Sports", ko: "첨단 해양·수상스포츠", templateId: "fitness" },
  { id: "surfing", label: "Surfing", ko: "서핑", templateId: "fitness" },
  { id: "sailing-yachting", label: "Sailing & Yachting", ko: "요트·세일링", templateId: "custom" },
  { id: "diving-snorkeling", label: "Diving & Snorkeling", ko: "다이빙·스노클링", templateId: "custom" },
  { id: "fishing", label: "Fishing", ko: "낚시", templateId: "custom" },
  { id: "boat-fishing", label: "Boat Fishing", ko: "배낚시", templateId: "custom" },
  { id: "rock-fishing", label: "Rock Fishing", ko: "록피싱·갯바위낚시", templateId: "custom" },
  { id: "deep-sea-fishing", label: "Deep Sea Fishing", ko: "심해·외해낚시", templateId: "custom" },
  { id: "shore-fishing", label: "Shore Fishing", ko: "방파제·해변낚시", templateId: "custom" },
  { id: "kayak-fishing", label: "Kayak Fishing", ko: "카약낚시", templateId: "fitness" },
  { id: "drone-fishing", label: "Drone Fishing", ko: "드론피싱·첨단낚시", templateId: "custom" },
  { id: "fishing-charter", label: "Fishing Guide & Charter", ko: "낚시 가이드·차터", templateId: "custom" },
  { id: "kayak-canoe", label: "Kayak & Canoe", ko: "카약·카누", templateId: "fitness" },
  { id: "jetski-waterski", label: "Jet Ski & Water Ski", ko: "제트스키·수상스키", templateId: "fitness" },
  { id: "swimming-open-water", label: "Swimming & Open Water", ko: "수영·오픈워터", templateId: "fitness" },
];

const ALL_ROOMS = [...ROOM_DIRECTORY, ...EXTRA_ROOMS];
const ROOM_BY_ID = new Map(ALL_ROOMS.map((room) => [room.id, room]));

const CATEGORIES = [
  ["business", "💼", "Business & Office", "사업·회사", "AI agents · automation · live analytics", ["business-operations","executive-office","customer-service","reception","sales","hr-recruitment","project-management","crm-client-management","billing-payments","procurement","consulting"]],
  ["legal-finance", "⚖️", "Legal, Finance & Compliance", "법률·금융·규정", "AI legal research · contracts · risk scoring", ["legal","accounting-tax","finance","insurance","immigration-visa","patent-ip","compliance-risk","documents-contracts","esign-approval","personal-finance"]],
  ["property-home", "🏠", "Property, Building & Home", "부동산·건축·주택", "3D digital twin · BIM · drones · smart home", ["real-estate","property-management","construction-trades","architecture-design","dream-home-3d","renovation-home-repair","building-materials","hardware-tools","energy-solar"]],
  ["health-care", "🏥", "Health & Care", "의료·건강·복지", "telehealth · AI support · wearables", ["medical-clinic","dental","allied-health","pharmacy","mental-health","aged-care","disability-support","pet-care"]],
  ["education-research", "🎓", "Education & Research", "교육·학습·연구", "AI tutor · simulation · AR/VR", ["education","ai-tutor","university-research","translation-languages","research-intelligence","personal-research"]],
  ["sports-fitness", "⚽", "Sports & Fitness", "스포츠·운동·짐", "wearables · motion analysis · AI coaching", ["sports","sports-club-team","athlete-coach","fitness-gym","gym-fitness-center","hang-gliding","paragliding"]],
  ["marine-sports", "🌊", "Advanced Marine & Water Sports", "첨단 해양·수상스포츠", "drones · GPS · sonar · weather intelligence", ["marine-water-sports","surfing","sailing-yachting","diving-snorkeling","fishing","boat-fishing","rock-fishing","deep-sea-fishing","shore-fishing","kayak-fishing","drone-fishing","fishing-charter","kayak-canoe","jetski-waterski","swimming-open-water"]],
  ["games-hobby", "🎮", "Games & Hobbies", "게임·취미", "AI opponents · XR/VR · esports analytics", ["hobby-room","chess-janggi","baduk-go","board-games","video-games","pro-gaming-esports","hobby","gaming-esports","music","dance"]],
  ["travel-hospitality", "✈️", "Travel & Hospitality", "여행·숙박", "AI itinerary · live translation · smart booking", ["travel","hotel-hospitality","events-wedding"]],
  ["food-dining", "🍽️", "Food & Dining", "음식·맛집·식당", "AI menu · smart kitchen · automated ordering", ["restaurant-cafe","food-grocery"]],
  ["shopping-commerce", "🛍️", "Shopping & Commerce", "쇼핑·판매·상거래", "AI shopping agent · smart checkout · prediction", ["retail","online-store","marketplace","home-shopping","shopping-assistant"]],
  ["fashion-beauty", "👗", "Fashion & Beauty", "패션·미용", "virtual try-on · 3D styling · AR fitting", ["fashion","beauty-salon"]],
  ["technology-ai", "🤖", "Technology & AI", "기술·AI", "AI agents · cloud · cybersecurity · automation", ["it-software","ai-automation","cybersecurity","telecom-phone","electronics-appliances","website-builder","app-development","coding-developer","security-safety"]],
  ["industry-transport", "🏭", "Industry, Transport & Resources", "산업·운송·자원", "robotics · IoT · digital twin · predictive maintenance", ["manufacturing","transport-logistics","automotive","agriculture-farming","greenhouse-horticulture","inventory-warehouse"]],
  ["media-creative", "🎬", "Media & Creative", "미디어·콘텐츠·창작", "generative AI · virtual studio · real-time production", ["marketing-media","creative-studio","photo-video","creator-influencer","news-current-affairs"]],
  ["government-global", "🌍", "Government, Community & Global", "정부·공공·국제", "digital services · open data · multilingual AI", ["government-public","nonprofit-association","community","charity-social-support","international-trade","import-export","emergency-disaster"]],
  ["personal-family", "👨‍👩‍👧", "Personal & Family", "개인·가족·생활", "personal AI · smart home · life automation", ["personal-assistant","family","career-job-search","personal-finance","personal-research"]],
  ["space-future", "🚀", "Space & Future", "우주·미래기술", "satellite data · remote sensing · robotics", ["space-services","satellite-internet","earth-observation","space-research","environment-sustainability","energy-solar"]],
  ["custom", "✨", "Anything / Custom", "맞춤형", "AI recommends the newest suitable systems", ["custom"]],
] as const;

type ExistingRoom = { id?: string; name?: string; status?: string };

export default function TopRoomFinderOverlay() {
  const params = useParams<{ id: string }>();
  const currentRoomId = params?.id || "";
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const clean = query.trim().toLowerCase();
  const selectedCategory = CATEGORIES.find((item) => item[0] === categoryId) || null;

  useEffect(() => {
    const openFinder = () => setOpen(true);
    window.addEventListener("rc:open-room-finder", openFinder);
    return () => window.removeEventListener("rc:open-room-finder", openFinder);
  }, []);

  const visibleRooms = useMemo(() => {
    if (clean) return ALL_ROOMS.filter((room) => `${room.label} ${room.ko}`.toLowerCase().includes(clean));
    if (!selectedCategory) return [];
    return selectedCategory[5].map((id) => ROOM_BY_ID.get(id)).filter(Boolean) as RoomDirectoryItem[];
  }, [clean, selectedCategory]);

  async function chooseRoom(room: RoomDirectoryItem) {
    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const payload = response.ok ? await response.json() : null;
      const existing = Array.isArray(payload?.rooms) ? payload.rooms as ExistingRoom[] : [];
      const candidates = [room.ko, room.label, `${room.ko}룸`, `${room.label} Room`]
        .map((value) => value.toLowerCase().replace(/\s+/g, ""));
      const match = existing.find((item) => {
        if (!item?.id || item.status === "archived") return false;
        const name = String(item.name || "").toLowerCase().replace(/\s+/g, "");
        return candidates.some((candidate) => candidate && (name === candidate || name.includes(candidate) || candidate.includes(name)));
      });
      if (match?.id) {
        window.location.assign(`/rooms/${encodeURIComponent(match.id)}`);
        return;
      }
    } catch {}

    const next = new URL("/room-builder", window.location.origin);
    next.searchParams.set("template", room.templateId);
    next.searchParams.set("name", room.label);
    next.searchParams.set("roomType", room.id);
    if (currentRoomId) next.searchParams.set("returnRoom", currentRoomId);
    window.location.assign(next.toString());
  }

  function close() {
    setOpen(false);
    setCategoryId(null);
    setQuery("");
  }

  if (!open) return null;

  return (
    <section className="fixed right-[178px] top-2 z-[500] flex h-[calc(100dvh-16px)] w-[420px] flex-col overflow-hidden rounded-xl border-2 border-[#d9b44a] bg-[#07111f]/98 shadow-[-18px_20px_60px_rgba(0,0,0,.66)] backdrop-blur-md">
      <div className="border-b border-white/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-[#f6d873]">Room Finder</div>
            <div className="text-[10px] text-white/55">Step 1: Choose a category → Step 2: Choose a Room</div>
          </div>
          <button type="button" onClick={close} className="grid h-7 w-7 place-items-center rounded-md border border-white/10 text-white/70 hover:bg-white/5" title="Close"><X size={15} /></button>
        </div>
        <div className="relative mt-2">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/45" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 w-full rounded-md border border-red-500/55 bg-black/25 pl-8 pr-2 text-[11px] text-white outline-none focus:border-red-400" placeholder="Search Rooms: Legal, Fashion, Drone Fishing, Travel" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!clean && !selectedCategory ? (
          <>
            <div className="mb-3 text-[10px] font-bold text-red-300">Step 1 · Choose a category</div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-3">
              {CATEGORIES.map((category) => (
                <button
                  key={category[0]}
                  type="button"
                  onClick={() => setCategoryId(category[0])}
                  className="group min-w-0 bg-transparent p-0 text-left"
                  title={category[2]}
                >
                  <span className="block truncate text-[11px] font-semibold leading-4 text-white group-hover:text-[#f6d873]">{category[2]}</span>
                  <span className="block truncate text-[9px] leading-4 text-cyan-300/80 group-hover:text-cyan-200">{category[4]}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="sticky top-0 z-10 mb-2 flex items-center justify-between bg-[#07111f]/96 py-1.5">
              <button type="button" onClick={() => { setCategoryId(null); setQuery(""); }} className="flex items-center gap-1 text-[10px] font-semibold text-[#f6d873]"><ArrowLeft size={12} /> Back to categories</button>
              <span className="text-[9px] text-white/45">Step 2 · Choose a Room</span>
            </div>
            {selectedCategory && !clean ? (
              <div className="mb-3 border-b border-white/10 pb-2">
                <div className="text-[11px] font-bold text-[#f6d873]">{selectedCategory[2]}</div>
                <div className="mt-1 text-[9px] text-cyan-300">Advanced systems: {selectedCategory[4]}</div>
              </div>
            ) : null}
            <div>
              {visibleRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => void chooseRoom(room)}
                  className="group flex min-h-[46px] w-full cursor-pointer items-center gap-3 border-b border-white/25 bg-transparent px-3 py-2 text-left transition-colors hover:border-[#d9b44a]/80 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f6d873]"
                >
                  <span className="pointer-events-none min-w-0 flex-1 truncate text-[14px] font-bold leading-5 text-white group-hover:text-[#fff5c4]">{room.label}</span>
                  <span className="pointer-events-none shrink-0 text-[12px] font-bold text-[#f6d873] group-hover:text-[#ffe98c]">Select ›</span>
                </button>
              ))}
              {!visibleRooms.length ? <div className="px-2 py-5 text-center text-[10px] text-white/45">No matching Rooms found.</div> : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
