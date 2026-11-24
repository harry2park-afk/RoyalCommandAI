import { ImageResponse } from "next/og";
export function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") return new Response(null,{status:404});
  const size = new URL(request.url).searchParams.get("size") === "512" ? 512 : 192;
  return new ImageResponse(<div style={{display:"flex",width:"100%",height:"100%",alignItems:"center",justifyContent:"center",background:"#09131e",color:"#79edc7",fontSize:size*.42,fontWeight:700}}>RC</div>,{width:size,height:size});
}
