/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    "/api/website-studio/work": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
