# 기존 기능 지도 — 만들기 전에 찾기

기준: 2026-09-20, 기능 HEAD `4a363ad`. 경로는 저장소 루트 기준. 구현 존재와 서비스 운영 완료는 다르다. 문서가 오래되면 최신 커밋/실제 코드/요청이 우선하며 그 차이를 기록한다.

| 기존 영역 | 우선 확인할 원본 | 증거·제한 |
|---|---|---|
| 공통 모듈 번호/복제 | `src/lib/core/registry.ts`, `docs/RC_CORE_NUMBERING_AND_CLONE_POLICY.md` | RC-CORE-001~010 체계를 먼저 확인. 번호를 위해 작동 파일을 일괄 이동하지 않음 |
| RC V3 룸/버튼/저장 | `src/app/rcv3/Room.tsx`, `src/lib/rcv3/cloud-state.ts`, `src/lib/rcv3/access.ts`, `rcv3/` | `docs/verification/rcv3-preview-integration-20260918.md`, `rcv3-customer-controls-20260918.md`. 오래된 '클론은 디자인 상속' 설명은 후속 개인정보 경계 변경과 대조 |
| 디자인/카탈로그 | `src/app/rcv3/RoomCatalog.tsx`, `src/lib/rcv3/templates.ts`, `src/lib/rcv3/room-catalog.ts` | `docs/verification/rcv3-gallery-20260918.md`; `dce33f5` 6개 사무실 배경. 배경과 기능 버튼은 별개 |
| 목적별 Create Room | `src/app/rcv3/create/CreateRoomWizard.tsx`, `src/lib/rcv3/room-draft.ts`, `src/app/api/rcv3/drafts/` | `7157b88` 기존 폼; `d04ef89` 비서 연락처; `8161c1c` 단순화. `docs/RCV3_CREATION_DRAFT_IMPLEMENTATION.md` 및 verification의 secretary-setup/simple-form-help 문서 |
| 결제/약관/룸 생성 | `src/app/rcv3/create/CheckoutPanel.tsx`, `src/lib/rcv3/checkout-ledger.ts`, `src/lib/rcv3/stripe-checkout.ts`, `src/lib/rcv3/paid-service-guard.ts`, `src/app/api/rcv3/checkout/` | `7606b3a`, `docs/verification/rcv3-paid-room-checkout-20260920.md`. 설정 미완료 시 닫힘 유지. 결제 확인 우회나 중복 룸 생성 금지 |
| Katie 개인 정보·복사 | `src/lib/rcv3/cloud-state.ts`, `src/lib/ai-secretary/katie-gmail-policy.ts`, `src/app/rooms/[id]/CustomerAISecretary.tsx` | `4322002`, `docs/verification/rcv3-katie-portable-privacy-20260920.md`. 공통 기능은 유지, 고객 데이터/인증/전화 연결은 새 고객 것만 |
| Gmail 목록·검토 | `src/app/api/rooms/[id]/ai-secretary/gmail/route.ts`, `src/lib/ai-secretary/`, `docs/KATIE_MAIL_CHAT_WIRING.md` | `a747bb5`, `docs/verification/katie-all-mail-20260920.md`. 모든 받은메일 페이지 순회; Sent/Drafts/Spam/Trash 제외. Google 재인증 미완료 |
| 전화 수신 기록 | `src/app/api/webhooks/retell/post-call/route.ts`, `src/lib/integrations/retellCallRecords.ts`, `retellOwnerReport.ts` | 서명/중복/소유자 확인 유지. `docs/KATIE_ORIGINAL_CALL_RECORDINGS.md`, `KATIE_OWNER_REPORT_SETUP.md`를 관련 시 읽기 |
| Katie 음성 복구 | `src/app/rooms/[id]/SecretaryVoice.tsx`, `src/lib/ai-secretary/voice-recovery.ts`, `realtime-voice-session.ts` | `docs/verification/katie-voice-preview-20260916.md`, portable-privacy 문서. 외부 음성 timeout 후 명시적 재시도 경로 |
| RC V3 마이크 | `rcv3/voice-control.mjs`, `src/app/api/rcv3/audio/route.ts` POST | `docs/verification/rcv3-live-dictation-20260918.md`. 사용자 발언을 입력창에서 수정한 후 Send. 물리 Android 마이크 테스트와 합성 TTS→STT를 혼동 금지 |
| 스피커 ON/OFF | `src/lib/client/answer-speaker.ts`, `src/app/rcv3/AnswerCards.tsx`, `src/app/rooms/[id]/AIHelperChat.tsx` | `00a1ceb`, `docs/verification/persistent-answer-speaker-20260920.md`. 별도 playing 상태와 영구 ON 분리. `AIHelperVoiceBridge.tsx`는 파일이 있어도 StableRoomV3에서 해제됨—다시 장착하지 않음 |
| 답변/읽기 언어 | `src/lib/rcv3/answer-language.ts`, `speech-language.ts`, `src/app/api/rcv3/chat/route.ts`, audio PUT | `4a363ad`, `docs/verification/selected-answer-language-20260920.md`. 저장된 선택 언어를 서버에서 소유자 범위로 확인. 번역 실패를 원문 영어 재생으로 감추지 않음 |
| 설명 Translate | `src/components/help/HelpText.tsx`, `src/lib/locale/help-catalog.ts`, `src/app/api/ui/help/route.ts` | `8161c1c`, `4185e26`, simple-form-help 문서. 공개 설명 키만 번역; 고객 메일/계약 내용을 이 경로에 전송하지 않음 |
| 공통 언어 선택 저장 | `src/app/rooms/[id]/IndependentAIRooms.tsx` chooseLocale, `src/components/RoomPreferenceAuthority.tsx`, `src/app/api/user/preferences/route.ts` | 선택 저장은 profiles.default_language/ui_preferences에 반영. 가입 auth metadata만 읽으면 이후 변경이 빠짐 |
| 기존 RC 카드/입력창 | `src/app/rooms/[id]/IndependentAIRooms.tsx`, `IndependentAIRooms.module.css` | 기존 RCA 화면. RC V3와 다른 surface이므로 사용자 화면/경로부터 확인. 과거 UI 수치는 최신 요청과 대조 |
| Legal 10 / Accounting 8 | `src/lib/rooms/professional-room-core.ts`, `professional-room-directory.ts`, `professional-legal.ts`, `src/app/room-builder/RoomDirectoryPicker.tsx`, `src/app/api/room-factory/rooms/route.ts` | Git 기록 `ba40a45` 존재 확인. 이전 대화의 원본 후보 PR626/e0bdf33. 18개를 새로 발명하지 않음; 현재 실제 생성/결제/서비스 범위는 별도 확인 |
| 고객 레이아웃 편집 | `src/components/CustomerRoomDesigner.tsx`, `src/components/SecureProtectedLayoutEditor.tsx`, `docs/RC_PROTECTED_VISUAL_LAYOUT_EDITOR_V1.md` | 고객 편집과 본사 보호 편집의 권한 차이를 유지. 버튼과 원래 동작의 이벤트 충돌 점검 |
| 대화 저장/메모리 | `src/lib/rcv3/execution.ts`, `src/lib/ai/roomConversationMemory.ts`, `src/app/rooms/[id]/ServerConversationBridge.tsx` | 고객 대화 런타임과 이 개발 인수인계 문서는 별개. GitHub 기억을 고객 대화 저장소로 쓰지 않음 |

## 기존 기능을 못 찾을 때

`rg --files` → 기능 이름/화면 문구/경로 검색 → `git log --all -- <path>` 및 관련 커밋 → GitHub PR/이슈 순으로 좁혀 찾는다. 다른 branch의 원본은 읽기/검토만 하고 검증 없이 wholesale merge하지 않는다. 결과는 FOUND / PARTIAL / NOT FOUND와 검색 범위로 기록한다. 이 지도는 유지보수 출발점이지 모든 기능이 운영 준비됐다는 인증서가 아니다.
