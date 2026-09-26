import type { MetadataRoute } from "next";
export function GET() {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") return new Response(null, {status:404});
  const manifest: MetadataRoute.Manifest = {
    id: "/rcv3", name: "Royal Command", short_name: "RC",
    description: "Your Royal Command rooms and AI secretary.",
    start_url: "/rcv3", scope: "/rcv3", display: "standalone",
    background_color: "#09131e", theme_color: "#09131e",
    icons: [192,512].map(size => ({src:`/rcv3/app-icon?size=${size}`,sizes:`${size}x${size}`,type:"image/png",purpose:"any"})),
  };
  return Response.json(manifest, {headers:{"Content-Type":"application/manifest+json","Cache-Control":"no-cache"}});
}
