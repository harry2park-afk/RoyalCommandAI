import type { ReactNode } from "react";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        /* Login must escape the legacy desktop Room viewport lock. */
        @media (min-width: 901px) {
          html:has(body main form input[autocomplete="current-password"]) {
            height: auto !important;
            min-height: 100% !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
          }
          body:has(main form input[autocomplete="current-password"]) {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100dvh !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
          }
        }
      `}</style>
      {children}
    </>
  );
}
