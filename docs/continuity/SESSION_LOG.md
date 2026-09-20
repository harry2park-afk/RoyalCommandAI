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
