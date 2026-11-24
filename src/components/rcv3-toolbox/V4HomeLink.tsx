import {getTool} from "@/lib/rcv3/toolbox";

// Navigation only. The V4 server resolves the signed-in account's first room.
// Never carry a room ID, membership flag, credential, or arbitrary return URL.
export function v4HomeHref(language: string) {
 const lang = ["en", "ko", "ja", "zh", "hi"].includes(language) ? language : "en";
 return "https://royalcommand.ai/v4/enter?lang=" + lang;
}
export default function V4HomeLink({language}: {language: string}) {
 const tool = getTool("room-list");
 return <a data-rc-tool="room-list" data-rc-tool-version={tool.version} href={v4HomeHref(language)} className="flex shrink-0 items-center rounded-lg border border-[#d7b64d] bg-[#234e57] px-3 py-2 text-sm font-semibold text-white" style={{minHeight:44}}><span aria-hidden="true">⌂&nbsp;</span>Harry’s room</a>;
}
