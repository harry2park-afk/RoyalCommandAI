// Content-only practice layer. Stable source IDs and assessment rules remain unchanged.
type Topic = {id:string;title:string;koTitle:string};
const starters = [
  [
    "Ask one simple question",
    "첫 질문 한 문장 보내기",
    "Explain AI in two short sentences for a beginner.",
    "AI가 무엇인지 초보자에게 짧은 두 문장으로 설명해줘.",
    "Make that easier and give one everyday example.",
    "더 쉽게 설명하고 생활 속 예를 하나 들어줘."
  ],
  [
    "Say what you need",
    "원하는 일 말하기",
    "Write a polite thank-you message to a friend in two sentences. Use the fictional name Alex.",
    "가상의 친구 민수에게 감사 인사를 공손한 두 문장으로 써줘.",
    "Make it warmer without adding facts I did not give you.",
    "내가 말하지 않은 사실을 넣지 말고 조금 더 다정하게 바꿔줘."
  ],
  [
    "Add the situation",
    "상황을 알려주기",
    "For practice, draft a message to a fictional supplier asking when an order will arrive. The order date is unknown; do not invent it.",
    "연습용으로 가상의 거래처에 주문한 물건이 언제 도착하는지 묻는 글을 써줘. 주문 날짜는 모르니 만들지 마.",
    "Keep the unknown date out and ask only about delivery.",
    "모르는 날짜는 빼고 배송일만 물어봐줘."
  ],
  [
    "Choose the format",
    "답변 모양 정하기",
    "Give me three steps for organising a fictional desk. Use a numbered list.",
    "가상의 책상을 정리하는 방법 세 가지를 번호 목록으로 알려줘.",
    "Keep each step to one short sentence.",
    "각 항목을 짧은 한 문장으로 바꿔줘."
  ],
  [
    "Name the audience",
    "누가 읽을지 알려주기",
    "Explain an AI assistant to someone using a computer for the first time, without technical words.",
    "컴퓨터를 처음 쓰는 사람에게 AI 비서를 어려운 용어 없이 설명해줘.",
    "Use the example of writing a greeting.",
    "인사말을 쓰는 예로 다시 설명해줘."
  ],
  [
    "Set the tone and length",
    "말투와 길이 정하기",
    "Write a polite practice email asking a fictional shop about opening hours, in English, in no more than five lines.",
    "가상의 가게에 영업시간을 묻는 연습용 이메일을 공손한 영어로 다섯 줄 이내로 써줘.",
    "Add a short subject and make the body simpler. Do not send it.",
    "짧은 제목을 붙이고 본문을 더 쉽게 바꿔줘. 발송하지 마."
  ],
  [
    "Provide the source",
    "자료를 주고 부탁하기",
    "Summarise only this fictional note in one sentence: Meeting on Tuesday. Bring a notebook. Time not yet decided.",
    "다음 가상 메모만 한 문장으로 요약해줘: 화요일 회의. 공책 준비. 시간은 아직 미정.",
    "Separate confirmed details from what is still unknown.",
    "확정된 내용과 아직 모르는 내용을 나눠줘."
  ],
  [
    "Break up a large request",
    "큰 일을 작게 나누기",
    "Help plan a fictional small gathering. First ask me just one question about what I want.",
    "가상의 작은 모임을 준비하려고 해. 먼저 내가 원하는 것을 한 가지만 물어봐줘.",
    "There will be four people. Now suggest only the next step.",
    "네 명이 올 예정이야. 이제 다음 단계 하나만 알려줘."
  ],
  [
    "Improve a vague request",
    "막연한 질문 고치기",
    "Help me improve this request: Write something for my shop. Ask one question before drafting.",
    "이 요청을 더 좋게 고치도록 도와줘: 우리 가게 글 써줘. 쓰기 전에 한 가지만 물어봐줘.",
    "It is a fictional flower shop. Write a friendly two-sentence welcome for its website.",
    "가상의 꽃집이야. 웹사이트에 쓸 친근한 두 문장 환영 인사를 써줘."
  ],
  [
    "Check the answer",
    "답변을 직접 확인하기",
    "Using only these fictional figures, show the addition: Monday 20, Tuesday 30. Do not invent other days.",
    "가상 수치 월요일 20, 화요일 30만 사용하여 합계와 계산식을 보여줘. 다른 요일은 만들지 마.",
    "Explain how I can check this calculation myself.",
    "이 계산을 내가 직접 확인하는 방법을 알려줘."
  ],
  [
    "Request a correction",
    "고쳐 달라고 부탁하기",
    "Make a two-item checklist from this fictional note: Bring a notebook and a pen.",
    "다음 가상 메모로 두 항목 확인 목록을 만들어줘: 공책과 펜 준비.",
    "Change pen to pencil and keep everything else unchanged.",
    "펜을 연필로 바꾸고 나머지는 그대로 두어줘."
  ],
  [
    "Write your own request",
    "내 질문 직접 만들기",
    "Help draft a fictional appointment enquiry. Ask for available times, politely, in three lines. Do not make a booking.",
    "가상의 예약 문의 초안을 도와줘. 가능한 시간을 공손하게 세 줄로 물어봐줘. 예약을 확정하지 마.",
    "Show which parts of my request specify the task, context and output format.",
    "내 요청에서 할 일, 상황, 답변 형식을 정한 부분을 짚어줘."
  ]
] as const;
export function guidedPractice(topic:Topic,ko=false){
 const early=starters[Number(topic.id)-1];
 const task=early?(ko?early[1]:early[0]):(ko?`${topic.koTitle} 직접 해보기`:`Try: ${topic.title}`);
 const prompt=early?(ko?early[3]:early[2]):Number(topic.id)<=50
  ?(ko?`“${topic.koTitle}”를 초보자에게 두 문장으로 설명하고, 내가 직접 해볼 작은 연습 한 가지를 줘. 가상 자료만 쓰고 내 답을 기다려줘.`:`Explain “${topic.title}” to a beginner in two sentences, then give me one small task to try using fictional data. Wait for my answer.`)
  :(ko?`아래 수업의 “${topic.koTitle}” 과제를 연습하려고 해. 필요한 가상 자료를 먼저 제시하고 첫 단계 하나만 안내해줘. 내가 결과를 보내면 함께 확인해줘. 실제 발송·결제·계정 연결은 실행하지 마.`:`I want to practise the assignment “${topic.title}” below. Provide the necessary fictional data and guide only the first step. Wait for my result and help me check it. Do not send anything, pay or connect accounts.`);
 const revision=early?(ko?early[5]:early[4]):(ko?'내가 방금 보낸 시도에서 잘된 점 하나와 고칠 점 하나를 알려줘. 고치는 방법을 쉽게 설명한 뒤 내가 다시 해볼 때까지 기다려줘.':'Tell me one thing that worked and one thing to improve in my attempt. Explain the improvement simply and wait for me to try again.');
 return ko
  ? `먼저 직접 해보기: ${task}\nAI에게 부탁하는 말을 ‘프롬프트’라고 해요. 특별한 명령어나 영어가 필요하지 않아요. 익숙한 말로 ‘할 일 → 필요한 상황·자료 → 원하는 답변 형식’을 알려주세요. 처음에는 한 문장으로 충분해요.\n\n1. 짧은 시범\n예시 요청: “${prompt}”\n이것은 부탁하는 말의 예시이며, AI가 이미 실행한 결과는 아니에요.\n\n2. 내가 실행하기\n기존 튜터 질문창에 예시를 입력하거나 말한 뒤, 내용을 확인하고 보내세요. 답을 받은 다음 길이·내용이 요청과 맞는지 직접 살펴보세요. 음성 인식이 안 되면 글로 입력해도 돼요.\n\n3. 다시 부탁하기\n“${revision}”라고 이어서 보내고 처음 답과 비교하세요. 다음에는 예시의 상황이나 형식을 한 가지 바꿔 내 말로 다시 요청하세요.\n\n4. 결과 확인하기\n튜터에게 내가 보낸 질문, 받은 답 중 확인할 부분, 직접 확인한 점을 알려주세요. 모르는 것은 ‘아직 확인하지 못했어요’라고 말해도 됩니다. 튜터는 한 번에 고칠 점 하나를 안내하고 다시 시도할 기회를 줍니다. 읽기나 예시 복사만으로 실습을 했다고 판단하지 않아요. 이 연습 피드백과 아래 확인 문제·과제의 저장된 통과 기록은 별개예요. 개인정보·비밀번호 대신 가상 자료만 쓰세요.\n\n이제 연결해서 배우기\n아래 내용을 읽거나 들으며 방금 연습과 연결하세요. 어려우면 튜터에게 ‘더 쉽게, 예를 하나 들어줘’라고 물어보세요.\n\n`
  : `Try it first: ${task}\nA prompt is simply a request to AI. You do not need special commands or English. In your own language, state the task, the relevant context or data, and the output format. Start with one sentence.\n\n1. Short demonstration\nExample request: “${prompt}”\nThis is an example of what to ask, not a result that AI has already produced.\n\n2. Do it yourself\nType or dictate the request in the existing tutor conversation, check it and send it. Read the actual answer and check its content and length against your request. If dictation is unavailable, type instead.\n\n3. Ask again\nSend “${revision}” and compare the answers. Then change one detail or the format and write a request in your own words.\n\n4. Check your result\nTell the tutor your request, the part of the answer you want to check, and what you checked yourself. Say when something remains unverified. The tutor gives one improvement at a time and waits for another attempt. Reading or copying an example alone is not evidence of practice. This practice feedback is separate from the saved quiz or assignment assessment below. Use fictional data, never passwords or private information.\n\nConnect this to the lesson\nRead or listen to the material below and relate it to your attempt. Ask “Make it easier and give one example” whenever you need help.\n\n`;
}
export const PRACTICE_TUTOR_NOTES = `Use the Try it first activity in the supplied lesson. Teach through the existing conversation: brief explanation, one clearly labelled example request, learner attempt, result check, one correction, retry. Do not deliver every step at once. Begin with a single easy action and wait for the learner. Teach natural-language requests with task, context/data, output format, then follow-up refinement; special commands and English are not required. Do not write the learner's whole assignment for them or treat an example as their executed work. Ask for their actual attempt or a small non-sensitive excerpt, and check it against their request. Missing evidence means ask one short follow-up, not declare success. Give one strength and one concrete improvement; after an acceptable attempt invite the next step without claiming stored completion. Never alter quiz/project scores or claim tool execution, saving, sending, payment or account linking. Preserve the original lesson objectives after the beginner activity. If an API/tool/computer-use exercise needs an unavailable connection, explain the gap and practise a clearly labelled plan, never pretend it ran.`;
