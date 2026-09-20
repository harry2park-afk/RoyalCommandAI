export type CreateRoomProfileLocale = "en" | "fr" | "ko" | "ja";

type CreateRoomProfileCopy = {
  eyebrow: string;
  title: string;
  note: string;
  name: string;
  email: string;
  customerId: string;
  phone: string;
  address: string;
  defaultLanguage: string;
  notRegistered: string;
  signInRequired: string;
  roomNameLabel: string;
  roomNamePlaceholder: string;
  roomNameHelp: string;
  trainingTitle: string;
  trainingBody: string;
};

const COPY: Record<CreateRoomProfileLocale, CreateRoomProfileCopy> = {
  en: {
    eyebrow: "Customer Profile",
    title: "First, confirm your account details",
    note: "Information already saved at sign-up is shown automatically. Only missing details need to be added later.",
    name: "Name",
    email: "Email",
    customerId: "Customer ID",
    phone: "Phone",
    address: "Address",
    defaultLanguage: "Default language",
    notRegistered: "Not registered",
    signInRequired: "Sign-in required",
    roomNameLabel: "Choose a name for this Room",
    roomNamePlaceholder: "e.g. Park Accounting Office",
    roomNameHelp: "Choose the Room name you want and change it later if needed.",
    trainingTitle: "Free AI training & certificate benefit",
    trainingBody: "Members on Room plans starting at US$3.80 receive the 30-day AI training program, five exam attempts per cycle, and a free Royal Command electronic Certificate of Completion after achieving 70% or higher. If not passed, an extra two-week study period and five new attempts are provided until passed.",
  },
  fr: {
    eyebrow: "Profil client",
    title: "Commencez par vérifier les informations de votre compte",
    note: "Les informations déjà enregistrées lors de l’inscription s’affichent automatiquement. Seuls les éléments manquants pourront être complétés plus tard.",
    name: "Nom",
    email: "E-mail",
    customerId: "ID client",
    phone: "Téléphone",
    address: "Adresse",
    defaultLanguage: "Langue par défaut",
    notRegistered: "Non enregistré",
    signInRequired: "Connexion requise",
    roomNameLabel: "Choisissez un nom pour cette Room",
    roomNamePlaceholder: "ex. Bureau comptable Park",
    roomNameHelp: "Choisissez le nom de Room souhaité. Vous pourrez le modifier plus tard si nécessaire.",
    trainingTitle: "Formation IA et certificat offerts",
    trainingBody: "Les membres disposant d’un forfait Room à partir de 3,80 USD bénéficient du programme de formation IA de 30 jours, de cinq tentatives d’examen par cycle et d’un certificat électronique Royal Command gratuit après avoir obtenu au moins 70 %. En cas d’échec, deux semaines d’étude supplémentaires et cinq nouvelles tentatives sont offertes jusqu’à la réussite.",
  },
  ko: {
    eyebrow: "가입 고객 정보",
    title: "먼저 가입 정보를 확인해 주세요",
    note: "이미 가입할 때 등록된 정보는 다시 입력하지 않습니다. 저장되지 않은 항목만 나중에 보완할 수 있습니다.",
    name: "성명",
    email: "이메일",
    customerId: "고객 ID",
    phone: "전화번호",
    address: "주소",
    defaultLanguage: "기본 언어",
    notRegistered: "등록되지 않음",
    signInRequired: "로그인 필요",
    roomNameLabel: "이 Room의 이름을 정해 주세요",
    roomNamePlaceholder: "예: 박 회계사 사무실",
    roomNameHelp: "고객이 원하는 이름으로 정하고 나중에도 변경할 수 있습니다.",
    trainingTitle: "가입 고객 무료 AI 교육·수료증 혜택",
    trainingBody: "US$3.80 이상 Room 플랜 가입 고객은 30일 AI 교육, 기본 시험 5회, 70점 이상 합격 시 Royal Command 전자 수료증을 무료로 받을 수 있습니다. 불합격 시 2주 추가 학습과 새 시험 5회를 합격할 때까지 무료로 반복 제공합니다.",
  },
  ja: {
    eyebrow: "お客様プロフィール",
    title: "まずアカウント情報をご確認ください",
    note: "登録時に保存済みの情報は自動的に表示されます。不足している項目だけ後から追加できます。",
    name: "氏名",
    email: "メールアドレス",
    customerId: "お客様ID",
    phone: "電話番号",
    address: "住所",
    defaultLanguage: "既定の言語",
    notRegistered: "未登録",
    signInRequired: "サインインが必要です",
    roomNameLabel: "このRoomの名前を決めてください",
    roomNamePlaceholder: "例：Park会計事務所",
    roomNameHelp: "希望するRoom名を設定してください。必要に応じて後から変更できます。",
    trainingTitle: "無料AIトレーニング・修了証特典",
    trainingBody: "月額3.80米ドル以上のRoomプランをご利用のお客様は、30日間のAIトレーニング、1サイクルにつき5回の試験受験、70％以上の合格でRoyal Command電子修了証を無料で受け取れます。不合格の場合は、合格するまで2週間の追加学習と新たな5回の受験機会が無料で提供されます。",
  },
};

export function normalizeCreateRoomProfileLocale(value?: string): CreateRoomProfileLocale {
  const locale = (value || "en").trim().toLowerCase();
  if (locale.startsWith("fr")) return "fr";
  if (locale.startsWith("ko")) return "ko";
  if (locale.startsWith("ja")) return "ja";
  return "en";
}

export function createRoomProfileCopy(value?: string) {
  const locale = normalizeCreateRoomProfileLocale(value);
  return { locale, ...COPY[locale] };
}
