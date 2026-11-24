import type { ReactNode } from "react";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        @media (min-width: 901px) {
          html:has(body main.rc-login-legacy form input[autocomplete="current-password"]) {
            height: auto !important;
            min-height: 100% !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
          }

          body:has(main.rc-login-legacy form input[autocomplete="current-password"]) {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100dvh !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
          }

          body:has(main.rc-login-legacy form input[autocomplete="current-password"]) main.rc-login-legacy {
            min-height: 100dvh !important;
            overflow: visible !important;
            padding-top: 12px !important;
            padding-bottom: 20px !important;
          }

          body:has(main.rc-login-legacy form input[autocomplete="current-password"]) main.rc-login-legacy > div.relative.mx-auto.grid {
            min-height: auto !important;
            align-items: start !important;
          }

          body:has(main.rc-login-legacy form input[autocomplete="current-password"]) main.rc-login-legacy > div.relative.mx-auto.grid > section.rc-card {
            margin-top: 0 !important;
          }
        }
      `}</style>
      {children}
    </>
  );
}
