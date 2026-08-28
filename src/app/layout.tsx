import LoginCard from '@/components/LoginCard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RoyalCommand.ai — Royal Household OS',
  description:
    'A secure AI operating system for individuals, families and businesses. Neutral Rooms. Multi-AI orchestration.',
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <LoginCard />

      <footer className="mt-4 pb-2 text-xs text-white/35">
        RCA Developer Relay Test
      </footer>
    </main>
  );
}
