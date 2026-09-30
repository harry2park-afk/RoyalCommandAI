import "server-only";
import { headers } from "next/headers";
import { getDomainRuntimeContext } from "@/config/countryResolver";

export async function getServerDomainRuntimeContext() {
  const requestHeaders = await headers();
  const hostname = requestHeaders.get("x-rc-runtime-host") || requestHeaders.get("host") || "";
  return getDomainRuntimeContext(hostname, process.env.VERCEL_ENV);
}
