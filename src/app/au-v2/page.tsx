export const metadata = {
  title: "Royal Command V2 Australia Test Room",
  description: "Royal Command V2 isolated Australia staging room",
};

const AIS = ["ChatGPT", "Claude", "Gemini", "Grok"];

export default function AustraliaV2TestRoom() {
  return (
    <main className="min-h-screen bg-[#07101d] text-[#f4f0e7]">
      <header className="border-b border-[#d7b64d]/35 bg-[#20392f] px-5 py-4">
        <div className="text-2xl font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>
          Royal Command AI — Australia V2 Test Room
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-3 border-b border-[#d7b64d]/25 bg-[#20392f] px-5 py-3">
        <button className="rounded-md border border-[#FFD700] bg-[#0b1524] px-4 py-2 text-sm text-[#FFD700]">
          AI Warehouse
        </button>
        <button className="rounded-md border border-[#FFD700] bg-[#7A0C2E] px-4 py-2 text-sm font-semibold text-[#FFF3D6]">
          통합 답변 ▾
        </button>
        {AIS.map((ai) => (
          <button key={ai} className="rounded-md border border-[#d7b64d]/45 bg-transparent px-3 py-2 text-sm">
            {ai} ✓
          </button>
        ))}
      </section>

      <section className="mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center justify-center px-6 text-center">
        <div className="text-4xl">🤖</div>
        <h1 className="mt-4 text-3xl font-semibold" style={{ fontFamily: "Times New Roman, serif" }}>
          RC V2 Isolated Test Room
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
          This Australia domain is being used as an isolated staging area. The existing Royal Command Room is not modified by this page.
        </p>
      </section>
    </main>
  );
}
