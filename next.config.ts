import { withWorkflow } from "workflow/next";
/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  env: { STUDIO_PREVIEW_SHA: process.env.VERCEL_GIT_COMMIT_SHA || "" },
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    "/api/website-studio/work": ["./node_modules/@sparticuz/chromium/**", "./node_modules/playwright-core/**"],
    "/api/website-studio/v2/jobs": ["./node_modules/@sparticuz/chromium/**", "./node_modules/playwright-core/**"],
    "/.well-known/workflow/v1/step": ["./node_modules/@sparticuz/chromium/**", "./node_modules/playwright-core/**"],
  },
};

export default withWorkflow(nextConfig);
