"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, HeartPulse, Mic, ShieldCheck, UserRound, X } from "lucide-react";

type Lang = "ko" | "en" | "ja" | "zh" | "es" | "fr" | "de" | "vi" | "th" | "id";

type Copy = {
  subtitle: string; profile: string; photoHelp: string; health: string; info: string; safety: string; docs: string;
  healthIntro: string; placeholder: string; speak: string; listening: string; addHealthFile: string; healthWarning: string;
  profileFields: string[]; safetyFields: string[]; setting: string; addDocument: string; documentsEmpty: string;
  voiceUnsupported: string; openProfile: string; close: string; changePhoto: string; customerPhoto: string;
};

const COPY: Record<Lang, Copy> = {
  en: { subtitle:"Personal profile · Health · Safety · Documents", profile:"My Profile", photoHelp:"Click the photo to add or change the customer photo.", health:"Health Records", info:"My Information", safety:"Safety Settings", docs:"Important Documents", healthIntro:"Enter check-up results, medicines, allergies, medical history and doctor notes by typing, voice or file.", placeholder:"e.g. 2026-08-22 health check result...", speak:"Voice Entry", listening:"Listening...", addHealthFile:"Add Health File", healthWarning:"Health information is sensitive. This screen currently provides input tools only. Permanent server storage should be enabled only after an encrypted Health Vault, access controls and customer consent are in place.", profileFields:["Name · preferred name","Language","Region · time zone","Preferred explanation style","Interests","Frequently used Rooms","Accessibility settings"], safetyFields:["Emergency detection consent","Guardian · emergency contact","Location-use consent","Camera · microphone safety consent","Automatic screen lock","Unknown-user detection","Animal-risk response"], setting:"Settings", addDocument:"Add Important Document", documentsEmpty:"Collect personal documents here, such as insurance, ID, contracts and medical documents.", voiceUnsupported:"Voice input is not supported in this browser. Please use typing or file upload.", openProfile:"Open customer profile and health records", close:"Close", changePhoto:"Change photo", customerPhoto:"Customer photo" },
  ko: { subtitle:"개인 프로필 · 건강 · 안전 · 문서", profile:"내 프로필", photoHelp:"사진을 눌러 고객 사진을 넣거나 변경할 수 있습니다.", health:"건강 기록", info:"내 정보", safety:"안전 설정", docs:"중요 문서", healthIntro:"검진 결과, 약, 알레르기, 과거 병력, 의사 메모 등을 타이핑·음성·파일로 입력할 수 있습니다.", placeholder:"예: 2026-08-22 건강검진 결과...", speak:"말로 기록", listening:"듣는 중...", addHealthFile:"검진 파일 추가", healthWarning:"건강정보는 민감정보입니다. 이 화면은 입력 UI를 먼저 제공합니다. 서버 영구저장은 암호화·접근권한·고객동의가 연결된 전용 Health Vault가 준비된 뒤 활성화해야 합니다.", profileFields:["이름·선호 이름","언어","지역·시간대","선호하는 설명 방식","관심 분야","자주 쓰는 Room","접근성 설정"], safetyFields:["긴급상황 감지 동의","보호자·비상연락처","위치 사용 동의","카메라·마이크 안전감지 동의","자동 화면 잠금","낯선 사용자 감지","동물 위험 대응"], setting:"설정", addDocument:"중요 문서 추가", documentsEmpty:"보험, 신분증, 계약, 의료문서 등 필요한 개인 문서를 여기에 모으는 구조입니다.", voiceUnsupported:"이 브라우저에서는 음성 입력을 지원하지 않습니다. 타이핑 또는 파일 업로드를 사용해 주세요.", openProfile:"고객 프로필과 건강 기록 열기", close:"닫기", changePhoto:"사진 변경", customerPhoto:"고객 사진" },
  ja: { subtitle:"個人プロフィール · 健康 · 安全 · 書類", profile:"マイプロフィール", photoHelp:"写真をクリックして顧客写真を追加・変更できます。", health:"健康記録", info:"個人情報", safety:"安全設定", docs:"重要書類", healthIntro:"健診結果、薬、アレルギー、既往歴、医師メモを入力・音声・ファイルで記録できます。", placeholder:"例: 2026-08-22 健診結果...", speak:"音声入力", listening:"聞き取り中...", addHealthFile:"健康ファイル追加", healthWarning:"健康情報は機密情報です。暗号化されたHealth Vault、アクセス制御、顧客同意の準備後に永続保存を有効にしてください。", profileFields:["氏名・希望名","言語","地域・タイムゾーン","説明方法の希望","関心分野","よく使うRoom","アクセシビリティ設定"], safetyFields:["緊急検知への同意","保護者・緊急連絡先","位置情報への同意","カメラ・マイク安全検知への同意","自動画面ロック","不明ユーザー検知","動物リスク対応"], setting:"設定", addDocument:"重要書類を追加", documentsEmpty:"保険、身分証、契約、医療書類などをここにまとめます。", voiceUnsupported:"このブラウザは音声入力に対応していません。入力またはファイルアップロードを使用してください。", openProfile:"顧客プロフィールを開く", close:"閉じる", changePhoto:"写真変更", customerPhoto:"顧客写真" },
  zh: { subtitle:"个人资料 · 健康 · 安全 · 文件", profile:"我的资料", photoHelp:"点击照片即可添加或更换客户照片。", health:"健康记录", info:"我的信息", safety:"安全设置", docs:"重要文件", healthIntro:"可通过文字、语音或文件记录体检结果、药物、过敏、病史和医生备注。", placeholder:"例如：2026-08-22 体检结果...", speak:"语音记录", listening:"正在聆听...", addHealthFile:"添加健康文件", healthWarning:"健康信息属于敏感信息。只有在加密Health Vault、访问控制和客户同意到位后，才应启用永久服务器存储。", profileFields:["姓名·常用名","语言","地区·时区","偏好的说明方式","兴趣","常用Room","无障碍设置"], safetyFields:["紧急情况检测同意","监护人·紧急联系人","位置使用同意","摄像头·麦克风安全检测同意","自动锁屏","陌生用户检测","动物风险应对"], setting:"设置", addDocument:"添加重要文件", documentsEmpty:"可在此集中保存保险、身份证件、合同和医疗文件。", voiceUnsupported:"此浏览器不支持语音输入，请使用文字或文件上传。", openProfile:"打开客户资料", close:"关闭", changePhoto:"更换照片", customerPhoto:"客户照片" },
  es: { subtitle:"Perfil personal · Salud · Seguridad · Documentos", profile:"Mi perfil", photoHelp:"Haz clic en la foto para añadir o cambiar la foto del cliente.", health:"Registros de salud", info:"Mi información", safety:"Configuración de seguridad", docs:"Documentos importantes", healthIntro:"Introduzca resultados médicos, medicamentos, alergias, historial y notas del médico por texto, voz o archivo.", placeholder:"Ej.: resultado médico 2026-08-22...", speak:"Entrada por voz", listening:"Escuchando...", addHealthFile:"Añadir archivo médico", healthWarning:"La información de salud es sensible. El almacenamiento permanente debe activarse solo con Health Vault cifrado, controles de acceso y consentimiento.", profileFields:["Nombre · nombre preferido","Idioma","Región · zona horaria","Estilo de explicación","Intereses","Rooms frecuentes","Accesibilidad"], safetyFields:["Consentimiento de detección de emergencias","Contacto de emergencia","Consentimiento de ubicación","Consentimiento de cámara y micrófono","Bloqueo automático","Detección de usuario desconocido","Respuesta a riesgo animal"], setting:"Ajustes", addDocument:"Añadir documento importante", documentsEmpty:"Guarde aquí seguros, identificación, contratos y documentos médicos.", voiceUnsupported:"Este navegador no admite entrada por voz.", openProfile:"Abrir perfil del cliente", close:"Cerrar", changePhoto:"Cambiar foto", customerPhoto:"Foto del cliente" },
  fr: { subtitle:"Profil personnel · Santé · Sécurité · Documents", profile:"Mon profil", photoHelp:"Cliquez sur la photo pour ajouter ou modifier la photo du client.", health:"Dossier de santé", info:"Mes informations", safety:"Paramètres de sécurité", docs:"Documents importants", healthIntro:"Saisissez bilans, médicaments, allergies, antécédents et notes du médecin par texte, voix ou fichier.", placeholder:"Ex. résultat médical 2026-08-22...", speak:"Saisie vocale", listening:"Écoute...", addHealthFile:"Ajouter un fichier santé", healthWarning:"Les données de santé sont sensibles. Le stockage permanent ne doit être activé qu’avec un Health Vault chiffré, des contrôles d’accès et le consentement du client.", profileFields:["Nom · nom préféré","Langue","Région · fuseau horaire","Style d’explication","Centres d’intérêt","Rooms fréquentes","Accessibilité"], safetyFields:["Consentement détection d’urgence","Contact d’urgence","Consentement localisation","Consentement caméra · micro","Verrouillage automatique","Détection utilisateur inconnu","Réponse risque animal"], setting:"Paramètres", addDocument:"Ajouter un document important", documentsEmpty:"Regroupez ici assurances, identité, contrats et documents médicaux.", voiceUnsupported:"La saisie vocale n’est pas prise en charge par ce navigateur.", openProfile:"Ouvrir le profil client", close:"Fermer", changePhoto:"Changer la photo", customerPhoto:"Photo du client" },
  de: { subtitle:"Persönliches Profil · Gesundheit · Sicherheit · Dokumente", profile:"Mein Profil", photoHelp:"Klicken Sie auf das Foto, um das Kundenfoto hinzuzufügen oder zu ändern.", health:"Gesundheitsdaten", info:"Meine Informationen", safety:"Sicherheitseinstellungen", docs:"Wichtige Dokumente", healthIntro:"Untersuchungsergebnisse, Medikamente, Allergien, Krankengeschichte und Arztnotizen per Text, Sprache oder Datei erfassen.", placeholder:"z. B. Untersuchung 2026-08-22...", speak:"Spracheingabe", listening:"Hört zu...", addHealthFile:"Gesundheitsdatei hinzufügen", healthWarning:"Gesundheitsdaten sind sensibel. Dauerhafte Speicherung erst mit verschlüsseltem Health Vault, Zugriffskontrollen und Kundeneinwilligung aktivieren.", profileFields:["Name · bevorzugter Name","Sprache","Region · Zeitzone","Bevorzugte Erklärung","Interessen","Häufige Rooms","Barrierefreiheit"], safetyFields:["Notfallerkennung Zustimmung","Notfallkontakt","Standort Zustimmung","Kamera · Mikrofon Zustimmung","Automatische Sperre","Unbekannte Nutzer erkennen","Tier-Risiko-Reaktion"], setting:"Einstellungen", addDocument:"Wichtiges Dokument hinzufügen", documentsEmpty:"Versicherung, Ausweis, Verträge und medizinische Dokumente hier sammeln.", voiceUnsupported:"Spracheingabe wird in diesem Browser nicht unterstützt.", openProfile:"Kundenprofil öffnen", close:"Schließen", changePhoto:"Foto ändern", customerPhoto:"Kundenfoto" },
  vi: { subtitle:"Hồ sơ cá nhân · Sức khỏe · An toàn · Tài liệu", profile:"Hồ sơ của tôi", photoHelp:"Nhấp ảnh để thêm hoặc đổi ảnh khách hàng.", health:"Hồ sơ sức khỏe", info:"Thông tin của tôi", safety:"Cài đặt an toàn", docs:"Tài liệu quan trọng", healthIntro:"Nhập kết quả khám, thuốc, dị ứng, tiền sử và ghi chú bác sĩ bằng văn bản, giọng nói hoặc tệp.", placeholder:"VD: kết quả khám 2026-08-22...", speak:"Nhập bằng giọng nói", listening:"Đang nghe...", addHealthFile:"Thêm tệp sức khỏe", healthWarning:"Thông tin sức khỏe là dữ liệu nhạy cảm. Chỉ bật lưu trữ lâu dài sau khi có Health Vault mã hóa, kiểm soát truy cập và sự đồng ý của khách hàng.", profileFields:["Tên · tên ưa dùng","Ngôn ngữ","Khu vực · múi giờ","Cách giải thích ưa thích","Sở thích","Room thường dùng","Cài đặt trợ năng"], safetyFields:["Đồng ý phát hiện khẩn cấp","Liên hệ khẩn cấp","Đồng ý vị trí","Đồng ý camera · mic","Khóa màn hình tự động","Phát hiện người lạ","Ứng phó rủi ro động vật"], setting:"Cài đặt", addDocument:"Thêm tài liệu quan trọng", documentsEmpty:"Tập hợp bảo hiểm, giấy tờ tùy thân, hợp đồng và tài liệu y tế tại đây.", voiceUnsupported:"Trình duyệt này không hỗ trợ nhập bằng giọng nói.", openProfile:"Mở hồ sơ khách hàng", close:"Đóng", changePhoto:"Đổi ảnh", customerPhoto:"Ảnh khách hàng" },
  th: { subtitle:"โปรไฟล์ส่วนตัว · สุขภาพ · ความปลอดภัย · เอกสาร", profile:"โปรไฟล์ของฉัน", photoHelp:"คลิกรูปเพื่อเพิ่มหรือเปลี่ยนรูปของลูกค้า", health:"บันทึกสุขภาพ", info:"ข้อมูลของฉัน", safety:"การตั้งค่าความปลอดภัย", docs:"เอกสารสำคัญ", healthIntro:"บันทึกผลตรวจ ยา อาการแพ้ ประวัติ และบันทึกแพทย์ด้วยข้อความ เสียง หรือไฟล์", placeholder:"เช่น ผลตรวจ 2026-08-22...", speak:"บันทึกด้วยเสียง", listening:"กำลังฟัง...", addHealthFile:"เพิ่มไฟล์สุขภาพ", healthWarning:"ข้อมูลสุขภาพเป็นข้อมูลอ่อนไหว ควรเปิดการจัดเก็บถาวรเมื่อมี Health Vault เข้ารหัส การควบคุมสิทธิ์ และความยินยอมของลูกค้า", profileFields:["ชื่อ · ชื่อที่ต้องการ","ภาษา","ภูมิภาค · เขตเวลา","รูปแบบคำอธิบาย","ความสนใจ","Room ที่ใช้บ่อย","การช่วยการเข้าถึง"], safetyFields:["ยินยอมตรวจจับเหตุฉุกเฉิน","ผู้ติดต่อฉุกเฉิน","ยินยอมใช้ตำแหน่ง","ยินยอมใช้กล้อง · ไมค์","ล็อกหน้าจออัตโนมัติ","ตรวจจับผู้ใช้แปลกหน้า","ตอบสนองความเสี่ยงจากสัตว์"], setting:"ตั้งค่า", addDocument:"เพิ่มเอกสารสำคัญ", documentsEmpty:"รวบรวมประกัน เอกสารประจำตัว สัญญา และเอกสารทางการแพทย์ที่นี่", voiceUnsupported:"เบราว์เซอร์นี้ไม่รองรับการป้อนข้อมูลด้วยเสียง", openProfile:"เปิดโปรไฟล์ลูกค้า", close:"ปิด", changePhoto:"เปลี่ยนรูป", customerPhoto:"รูปลูกค้า" },
  id: { subtitle:"Profil pribadi · Kesehatan · Keamanan · Dokumen", profile:"Profil Saya", photoHelp:"Klik foto untuk menambah atau mengganti foto pelanggan.", health:"Catatan Kesehatan", info:"Informasi Saya", safety:"Pengaturan Keamanan", docs:"Dokumen Penting", healthIntro:"Masukkan hasil pemeriksaan, obat, alergi, riwayat, dan catatan dokter melalui teks, suara, atau file.", placeholder:"Contoh: hasil pemeriksaan 2026-08-22...", speak:"Input Suara", listening:"Mendengarkan...", addHealthFile:"Tambah File Kesehatan", healthWarning:"Informasi kesehatan bersifat sensitif. Penyimpanan permanen hanya boleh diaktifkan setelah Health Vault terenkripsi, kontrol akses, dan persetujuan pelanggan tersedia.", profileFields:["Nama · nama pilihan","Bahasa","Wilayah · zona waktu","Gaya penjelasan","Minat","Room yang sering digunakan","Aksesibilitas"], safetyFields:["Persetujuan deteksi darurat","Kontak darurat","Persetujuan lokasi","Persetujuan kamera · mikrofon","Kunci layar otomatis","Deteksi pengguna asing","Respons risiko hewan"], setting:"Pengaturan", addDocument:"Tambah Dokumen Penting", documentsEmpty:"Kumpulkan asuransi, identitas, kontrak, dan dokumen medis di sini.", voiceUnsupported:"Browser ini tidak mendukung input suara.", openProfile:"Buka profil pelanggan", close:"Tutup", changePhoto:"Ganti foto", customerPhoto:"Foto pelanggan" },
};

const LOCALE: Record<Lang, string> = { ko:"ko-KR", en:"en-AU", ja:"ja-JP", zh:"zh-CN", es:"es-ES", fr:"fr-FR", de:"de-DE", vi:"vi-VN", th:"th-TH", id:"id-ID" };

function detectLang(): Lang {
  const selects = Array.from(document.querySelectorAll("select"));
  const text = selects.map((s) => `${s.value} ${s.options[s.selectedIndex]?.text || ""}`).join(" ").toLowerCase();
  if (/\bkr\b|korean|한국|🇰🇷/.test(text)) return "ko";
  if (/japan|日本|\bjp\b|🇯🇵/.test(text)) return "ja";
  if (/china|chinese|中文|\bcn\b|🇨🇳|taiwan|🇹🇼|hong kong|🇭🇰/.test(text)) return "zh";
  if (/spanish|español|\bes\b/.test(text)) return "es";
  if (/french|français|\bfr\b/.test(text)) return "fr";
  if (/german|deutsch|\bde\b/.test(text)) return "de";
  if (/vietnam|tiếng việt|\bvi\b/.test(text)) return "vi";
  if (/thai|ไทย|\bth\b/.test(text)) return "th";
  if (/indonesia|bahasa indonesia|\bid\b/.test(text)) return "id";
  return "en";
}

const TABS = [
  { id: "health", icon: HeartPulse }, { id: "profile", icon: UserRound }, { id: "safety", icon: ShieldCheck }, { id: "documents", icon: FileText },
] as const;
type TabId = (typeof TABS)[number]["id"];
type SpeechRecognitionLike = { lang:string; interimResults:boolean; continuous:boolean; start:()=>void; stop:()=>void; onresult:((event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void)|null; onend:(()=>void)|null; onerror:(()=>void)|null; };
type SpeechWindow = Window & { SpeechRecognition?:new()=>SpeechRecognitionLike; webkitSpeechRecognition?:new()=>SpeechRecognitionLike; };

export default function CustomerProfileHub() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("health");
  const [lang, setLang] = useState<Lang>("en");
  const [photoUrl, setPhotoUrl] = useState("");
  const [healthNote, setHealthNote] = useState("");
  const [listening, setListening] = useState(false);
  const [healthFiles, setHealthFiles] = useState<string[]>([]);
  const [documentFiles, setDocumentFiles] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const healthFileRef = useRef<HTMLInputElement>(null);
  const documentFileRef = useRef<HTMLInputElement>(null);
  const t = COPY[lang];

  useEffect(() => {
    const sync = () => setLang(detectLang());
    sync();
    document.addEventListener("change", sync, true);
    window.addEventListener("rc:language-change", sync as EventListener);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:["value"] });
    return () => { document.removeEventListener("change", sync, true); window.removeEventListener("rc:language-change", sync as EventListener); observer.disconnect(); };
  }, []);

  function choosePhoto(file?: File) { if (!file) return; const next=URL.createObjectURL(file); setPhotoUrl((current)=>{ if(current.startsWith("blob:")) URL.revokeObjectURL(current); return next; }); }
  function startVoiceEntry() {
    const speechWindow=window as SpeechWindow; const Recognition=speechWindow.SpeechRecognition||speechWindow.webkitSpeechRecognition;
    if(!Recognition){ window.alert(t.voiceUnsupported); return; }
    const recognition=new Recognition(); recognition.lang=LOCALE[lang]; recognition.interimResults=false; recognition.continuous=false;
    recognition.onresult=(event)=>{ const transcript=event.results?.[0]?.[0]?.transcript||""; if(transcript) setHealthNote((current)=>`${current}${current?"\n":""}${transcript}`); };
    recognition.onend=()=>setListening(false); recognition.onerror=()=>setListening(false); setListening(true); recognition.start();
  }

  const tabLabel = (id:TabId) => id==="health"?t.health:id==="profile"?t.info:id==="safety"?t.safety:t.docs;

  return <>
    <button type="button" onClick={()=>setOpen(true)} className="fixed right-3 top-[4px] z-[360] flex h-[45px] w-[45px] items-center justify-center overflow-hidden rounded-full border-2 border-[#d7bb68] bg-[#102030] shadow-[0_6px_24px_rgba(0,0,0,.38)]" aria-label={t.openProfile} title={t.profile}>
      {photoUrl?<img src={photoUrl} alt={t.customerPhoto} className="h-full w-full object-cover"/>:<UserRound size={21} className="text-[#f3d98c]"/>}
    </button>
    {open?<div className="fixed inset-0 z-[500] flex justify-end bg-black/45" role="dialog" aria-modal="true" aria-label="My Royal Command" onClick={()=>setOpen(false)}>
      <section className="h-full w-full max-w-[430px] overflow-y-auto border-l border-[#d7bb68]/60 bg-[#08131f] text-white shadow-2xl" onClick={(event)=>event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#08131f]/95 px-4 py-3 backdrop-blur">
          <div><div className="text-sm font-semibold text-[#f3d98c]">My Royal Command</div><div className="text-xs text-white/55">{t.subtitle}</div></div>
          <button type="button" onClick={()=>setOpen(false)} className="rounded-lg p-2 hover:bg-white/10" aria-label={t.close}><X size={18}/></button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 rounded-2xl border border-[#d7bb68]/25 bg-white/[0.03] p-3">
            <button type="button" onClick={()=>photoInputRef.current?.click()} className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#d7bb68] bg-[#102030]" title={t.changePhoto}>{photoUrl?<img src={photoUrl} alt={t.customerPhoto} className="h-full w-full object-cover"/>:<UserRound size={30} className="text-[#f3d98c]"/>}</button>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>choosePhoto(e.target.files?.[0])}/>
            <div className="min-w-0"><div className="font-semibold">{t.profile}</div><div className="mt-1 text-xs leading-5 text-white/60">{t.photoHelp}</div></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">{TABS.map((item)=>{const Icon=item.icon; const active=tab===item.id; return <button key={item.id} type="button" onClick={()=>setTab(item.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs ${active?"border-[#d7bb68] bg-[#d7bb68]/10 text-[#ffe8a5]":"border-white/10 bg-white/[0.02] text-white/75"}`}><Icon size={15}/>{tabLabel(item.id)}</button>;})}</div>
          {tab==="health"?<div className="mt-4 space-y-3"><div className="rounded-xl border border-red-400/25 bg-red-400/[0.05] p-3"><div className="text-sm font-semibold text-red-200">{t.health}</div><div className="mt-1 text-xs leading-5 text-white/60">{t.healthIntro}</div></div><textarea value={healthNote} onChange={(e)=>setHealthNote(e.target.value)} rows={8} placeholder={t.placeholder} className="w-full rounded-xl border border-white/15 bg-black/20 p-3 text-sm outline-none focus:border-[#d7bb68]"/><div className="grid grid-cols-2 gap-2"><button type="button" onClick={startVoiceEntry} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs hover:border-[#d7bb68]"><Mic size={15}/>{listening?t.listening:t.speak}</button><button type="button" onClick={()=>healthFileRef.current?.click()} className="rounded-xl border border-white/15 px-3 py-2 text-xs hover:border-[#d7bb68]">{t.addHealthFile}</button></div><input ref={healthFileRef} type="file" multiple className="hidden" onChange={(e)=>setHealthFiles(Array.from(e.target.files||[]).map((file)=>file.name))}/>{healthFiles.length?<div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/65">{healthFiles.map((name)=><div key={name}>• {name}</div>)}</div>:null}<div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-3 text-[11px] leading-5 text-amber-100/80">{t.healthWarning}</div></div>:null}
          {tab==="profile"?<div className="mt-4 space-y-2 text-sm">{t.profileFields.map((label)=><div key={label} className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">{label}</div>)}</div>:null}
          {tab==="safety"?<div className="mt-4 space-y-2 text-sm">{t.safetyFields.map((label)=><div key={label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3"><span>{label}</span><span className="text-xs text-white/45">{t.setting}</span></div>)}</div>:null}
          {tab==="documents"?<div className="mt-4 space-y-3"><button type="button" onClick={()=>documentFileRef.current?.click()} className="w-full rounded-xl border border-dashed border-[#d7bb68]/60 px-3 py-6 text-sm text-[#f3d98c]">{t.addDocument}</button><input ref={documentFileRef} type="file" multiple className="hidden" onChange={(e)=>setDocumentFiles(Array.from(e.target.files||[]).map((file)=>file.name))}/>{documentFiles.length?<div className="rounded-xl border border-white/10 p-3 text-xs text-white/65">{documentFiles.map((name)=><div key={name}>• {name}</div>)}</div>:<div className="text-xs text-white/45">{t.documentsEmpty}</div>}</div>:null}
        </div>
      </section>
    </div>:null}
  </>;
}
