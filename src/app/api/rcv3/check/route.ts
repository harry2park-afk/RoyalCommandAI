import { requirePaidService } from "@/lib/rcv3/checkout-ledger";
import { z } from "zod";
import { access, reply, failure, input } from "@/lib/rcv3/access";
import { reserve } from "@/lib/rcv3/execution";
import { getConnector } from "@/lib/ai/connectors";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    const d = z.object({ roomId: z.string().uuid(), requestId: z.string().uuid() }).strict().parse(await input(request,1000));
    const a = await access(d.roomId), key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("RCV3_AI_NOT_CONNECTED");
    requirePaidService(a.entitlement ?? null,"ai:openai");
    await reserve(a,d.requestId,"check");
    const started=performance.now();
    const answer=await getConnector("openai").complete({messages:[{role:"user",content:"2 더하기 3의 답을 숫자 한 글자로만 답하세요."}],maxTokens:20});
    if(answer.error||!answer.content.includes("5"))throw new Error("RCV3_CHECK_AI");
    const aiMs=performance.now()-started, speechStart=performance.now();
    const speech=await fetch("https://api.openai.com/v1/audio/speech",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4o-mini-tts",voice:"coral",input:"마이크 연결 테스트입니다."}),signal:AbortSignal.timeout(30000)});
    if(!speech.ok)throw new Error("RCV3_CHECK_SPEECH");
    const audio=await speech.blob();if(audio.size<100)throw new Error("RCV3_CHECK_SPEECH");
    const speechMs=performance.now()-speechStart,transcriptionStart=performance.now();
    const form=new FormData();form.set("file",audio,"test.mp3");form.set("model","gpt-4o-mini-transcribe");form.set("language","ko");
    const transcription=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{Authorization:`Bearer ${key}`},body:form,signal:AbortSignal.timeout(30000)});
    if(!transcription.ok)throw new Error("RCV3_CHECK_TRANSCRIPTION");
    const result=z.object({text:z.string()}).parse(await transcription.json());
    if(!result.text.includes("테스트"))throw new Error("RCV3_CHECK_TRANSCRIPTION");
    const evidence={release:"rcv3-1",at:new Date().toISOString(),aiMs,speechMs,transcriptionMs:performance.now()-transcriptionStart,transcript:result.text,physicalMicrophoneVerified:false};
    await a.store.insert(`checks/${Date.now()}-${d.requestId}.txt`,evidence);
    return reply(evidence);
  }catch(e){return failure(e);}
}
