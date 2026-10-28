# RC 진행 기록

상태값: REQUESTED / IMPLEMENTED / VERIFIED_PREVIEW / BLOCKED / SUPERSEDED. 한 기능에도 구현 완료와 운영 BLOCKED가 함께 있을 수 있다. 짧은 이력과 링크를 유지하고 전체 원문·고객 데이터를 복제하지 않는다.

## 2026-09-20까지 회수된 작업

| 커밋 | 내용 | 상태/증거 |
|---|---|---|
| `7157b88` | 목적별 계정 초안 wizard | IMPLEMENTED. 목적별 폼 재제작 금지 |
| `a747bb5` | Katie 받은메일 전체 페이지 검토/접속 상태 | IMPLEMENTED + BLOCKED Google 재인증. `../verification/katie-all-mail-20260920.md` |
| `1a203f8` | secretary 페이지 locale runtime context | IMPLEMENTED. 메일 성공과 혼동 금지 |
| `4322002` | Katie 복사 개인정보 분리·Gmail opt-in·음성 복구 | IMPLEMENTED. `../verification/rcv3-katie-portable-privacy-20260920.md` |
| `d04ef89` | Create Room 비서 이메일/전화 질문 | IMPLEMENTED; 연락처는 연결 의도, 외부 연결 미완료 |
| `7606b3a` | 월 결제·동의·서버 확인 후 단일 룸 생성 | IMPLEMENTED + BLOCKED sandbox 환경/승인 가격/약관/실제 결제 검증 |
| `8161c1c`, `4185e26` | 폼 단순화, Translate 공통 기능, 제목 겹침/가입 언어 수정 | VERIFIED_PREVIEW. 법률→회계 질문 변경 및 한국어 번역/영어 복귀 실제 확인. 20개 focused tests/build 통과 |
| `00a1ceb` | 스피커 지속 ON, 재생 큐/취소, 헬퍼 초기화 제거 | VERIFIED_PREVIEW RC V3. 한국어/영어 합성 재생, 다음 답변 자동 읽기, OFF 중단, reload ON/OFF 유지. 6 tests/build. Harry가 휴대폰에서 '잘 읽어준다' 확인; 모든 기기 인증은 아님 |
| `4a363ad` | RC 선택 언어 우선 답변·과거 외국어 답변 번역 읽기 | VERIFIED_PREVIEW. 영어 질문에 한국어 답변 및 Reading 상태 확인, 기존 영어 답변도 번역 재생 경로 성공. 15 tests/type/build. 배포 `dpl_3ghKzQ69pgeQcWPAfRWjE7ikstgn` READY |

## 이번 인수인계 기록 작업

- Harry 요청: 이전 대화를 압축해 GitHub에 저장하고 'RC 기억하고 시작해요'로 신규 창에서 이어가기; 완료 기능을 다시 만들지 않기.
- FAST 문서 작업, root 단독 작성. 현재 대화 + 이전 대화 검색 + Git/검증문서 대조. 고객 원문/키/개인 문서는 제외.
- 기존 RC-CORE 복제/업그레이드 정책이 이미 있으므로 대체 정책을 발명하지 않고 시작 문서와 기능 지도로 연결.
- 변경: root `RC_MEMORY.md`, 이 디렉터리의 결정/기능/세션 지도, `AGENTS.md` 재개·마무리 절차.
- 확인: 링크/파일 위치/커밋 존재, 개인정보/상태 구분, diff 체크. 문서만 변경하므로 기능 테스트/Production 배포 불필요. 이 문서 저장으로 부수 Preview 빌드가 시작될 수 있으나 새로운 기능 배포를 주장하지 않는다.
- 다음: 새 사용자 작업을 위 미완료 항목 또는 기존 모듈에 연결한다. 미완료 전체를 임의로 일괄 실행하지 않는다.

## 변경 기록에 쓸 수 있는 참고 항목

날짜/요청, 기존 원본 경로, 변경 내용, 커밋, 확인 결과와 남은 제한. 별도 필수 양식이나 매 작업 의무 갱신 절차는 아니다.

## 같은 날 Harry의 규칙 추가 금지 정정

- 기존 규칙 축소 문서를 대조: 중복 승인/검사/설명 제거, 위험에 필요한 검사만, 기존 공통 기능 재사용이라는 취지 확인. 참고 문서 자체는 '8개로 줄이는 제안 — 아직 미적용'으로 표시되어 있었으므로 적용 완료로 주장하지 않음.
- 직전 기억 저장 때 추가한 AGENTS의 의무 시작/종료 절차를 삭제하고 참고 링크만 남겼다. RC_MEMORY의 5단계 절차와 의무 다중 문서 갱신 표현도 삭제했다.
- 이전 기록의 '시작/종료 규칙 연결'은 이 정정으로 대체된다. 기능 지도·결정사항·작업 이력은 유지한다. 새로운 검사·승인 단계는 추가하지 않았다.

## 2026-09-20 — 고객 폼·본인 계정 연결 / 직접 통신사 청구

- Harry 승인 범위: 기존 RC V3 폼으로 고객 방 생성, ChatGPT 기본 선택, 다른 AI/개인 API 지원, 가입 이메일 자동 입력, 고객 본인 메일·전화 연결. 기존 Production/master 및 Harry 전화 설정 유지.
- 전화 방향 정정: RC가 번호를 사거나 재판매하지 않는다. 국가별 통신사 안내 후 고객 본인 명의·이메일·청구 주소·결제수단으로 직접 구매하고 통신사가 직접 청구한다. RC 월 구독과 전화요금은 분리.
- 기존 폼/결제/연결 엔진 재사용. 개인 AI 키는 서버 전용 암호화 저장, 고객/공급자별 요청으로 사용. 새 유료 주문은 국가·선택 AI·본인 Gmail 및 전화 소유 확인 후 진행. 기존 서명된 주문의 해시는 유지.
- 고객 전화: 본인 Twilio 계정/구매 번호 조회, 정확한 결제 주문과 수신 경로 변경 동의 확인, 전용 고객 Retell 에이전트로 연결. 실제 Twilio 통화 확인·서명·사용량 제한·중복 방지·불명확 결과 복구 처리. 고객 통화 기록은 서버가 생성한 통화 연결만 사용하며 Harry 방으로 대체 저장하지 않는다.
- 별도 고객 계정 테이블 6개를 추가하고 RLS 활성화 및 anon/authenticated 직접 접근 불가, service_role 접근 가능을 실제 SQL로 확인. 기존 고객 자료는 변경하지 않음.
- 구현 검증: 관련 116개 테스트 통과, Next 빌드 통과. 별도 검토에서 지적된 신규 폼 우회·쿠키 없는 결제 알림·AI 점검 비용 제한·전화 소유 및 중복 처리 문제를 보완.
- 미완료 운영 설정: 암호화 전용 키, 고객용 독립 Retell 키/게시된 공용 비서 에이전트/수신 주소, 승인 국가별 요금표·약관·결제 활성화. Vercel 설정 화면은 로그인 필요. Stripe 연결은 Royal Command Pty Ltd sandbox만 확인; 시험용 월 AUD10 가격 하나는 세금 설정 미지정이고 고객 요금표 승인을 의미하지 않음.
- 국가별 통신사 안내는 확인된 Twilio 문서에 근거한 AU/GB/US/CA/JP부터 표시. 다른 국가나 모든 통신사·개인 AI 구독을 지원한다고 주장하지 않음. 개인 ChatGPT 구독과 API 요금은 별도.
- 실제 고객 결제·전화번호 구매·전화 수신 경로 변경·외부 발송은 실행하지 않음. 실개통/고객 전체 이용 완료로 표시하지 말 것. 이 기록은 작업 이력이며 새 규칙이나 승인 절차가 아님.

## 2026-09-20 — RC V3 mobile install (Preview)
- Owner approved mobile reuse of existing RC V3. STANDARD; writer main agent, independent read-only PWA reviewer. Scope RC V3 layout, manifest/icon routes, installation help and mobile CSS only.
- Added scoped standalone manifest with generic /rcv3 launch (no owner/room identifiers), generated RC PNG icons, deferred browser install action with manual Android/iPhone help via shared translation.
- No service worker, private offline caching, new account or customer data copy. Same authenticated server rooms. No promise of background calls, push or offline AI.
- Mobile input font 16px, 44px send/header controls; preserve saved artwork coordinates. Removed viewport-fit cover after review to retain OS safe top inset when installed.
- Build/lint passed; Preview browser/OS installation verification tracked separately. Actual Android/iPhone launcher installation still requires a real device. Production/master unchanged.


## 2026-09-20 — Mobile continuity + customer account numbering

- Mobile RC V3 remains the same authenticated cloud Room, not a device-local copy. Existing customer Rooms are loaded from the server on phone/laptop/desktop; commit `33bdfc1316fcc9862a2e9aa4b3453cb8ea8fdb63` additionally rejects a stale/foreign `?room=` and falls back to the signed-in customer's newest valid Room. Preview deployment verified READY. Production/master unchanged.
- Customer isolation rechecked: RC V3 access requires signed-in owner ID, RC V3 marker, draft status and the owner's household; storage root is owner UUID + room UUID. Chat history is stored under that owner/Room scope. No shared seed/test conversation is copied into a new customer Room.
- Product direction confirmed for next Create Room simplification: ask only Room name and what the customer wants to do, then derive five relevant Room value choices. Do not ask unrelated onboarding questions. Charge/support only selected services.
- Phone application is separate from Room creation and can be opened later. Signup should collect only the minimum reusable customer details needed to prefill the phone application; customer reviews, signs and pays through the payment provider. Do not store raw card data in RC.
- Customer master-data direction: Supabase is the account/customer system of record; internal UUID remains the security identity. Human-readable RC customer number links account, Rooms, phone applications, agreements/signatures, invoices/payment references and support records. Secrets/API credentials remain separately protected.
- Database migration `add_secure_rc_customer_numbers` applied to the RoyalCommand Supabase project: new `public.rc_customer_accounts` has RLS enabled, anon access revoked, authenticated users can SELECT only their own row. Customer number format is `RC 0000000`; the number itself grants no access.
- Harry Park account was assigned the explicitly requested customer number `RC 0357060`. Automatic new-customer numbering is reserved to begin at `RC 0357071`. Internal UUID is not replaced by the display customer number.
- No raw card number was stored. No other customer's profile data was changed. The gap between 0357060 and 0357071 is intentional per owner instruction.
