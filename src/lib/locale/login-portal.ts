const text = {
  title: ["Your own AI space", "나의 AI 공간으로"],
  subtitle: ["A new day, with AI by your side", "AI와 함께 시작하는 새로운 하루"],
  enter: ["Enter my room", "내 방으로 들어가기"],
  login: ["Login", "로그인"],
  new: ["New here?", "처음이신가요?"],
  signup: ["Sign up", "회원가입"],
} as const;
export function loginPortalText(key: keyof typeof text, locale: string) {
  return text[key][locale.startsWith("ko") ? 1 : 0];
}
