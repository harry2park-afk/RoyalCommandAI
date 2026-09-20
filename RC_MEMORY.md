# RC 기억 — 새 창 시작점

최종 정리: 2026-09-20 UTC. 소유자: Harry Park. 호출 문구: **“RC 기억하고 시작해요”**, “RC 기억”, “RC 이어서”.

이 파일은 개발 인수인계용 압축 기억이다. 전체 채팅 원문이나 자동 동기화 서비스가 아니다. 현재 대화, 검색으로 회수된 이전 RC 대화 요약, 실제 Git 기록/코드/검증 문서를 합쳤다. 회수되지 않은 대화까지 전부 보관했다고 주장하지 않는다. 고객 메일·통화·비밀키·개인 문서는 넣지 않는다.

## 새 창에서 찾을 정보

이 문서는 **참고용 작업 기록이며 새 규칙·의무 절차·승인 단계가 아니다.** 기존 규칙의 기준은 `ROYAL_COMMAND_LAW.md`와 `AGENTS.md`이며, 재사용 원칙은 이미 있는 `docs/RC_CORE_NUMBERING_AND_CLONE_POLICY.md`에 정리돼 있다.

“RC 기억하고 시작해요”는 이 기록에서 지난 작업을 찾아 이어가자는 Harry의 요청 문구다. [기능 지도](docs/continuity/FEATURE_MAP.md)에 기존 코드와 검증 문서가, [진행 기록](docs/continuity/SESSION_LOG.md)에 완료/미완료와 변경 이력이 있다. 저장소는 `harry2park-afk/RoyalCommandAI`, 작업 branch는 `feat/independent-ai-rooms-v1-20260906`, PR은 **#748**이다.

매 작업마다 전체 문서를 읽거나 여러 문서를 의무 갱신하는 추가 절차는 없다. 필요한 기존 기능과 최근 상태를 찾기 위한 색인으로 사용한다. GitHub 접근이 없는 새 대화에서는 문서 링크나 저장소 연결이 필요하며, 모든 AI의 자동 로딩이나 전체 대화 기억을 보장하지 않는다.

## 현재 위치

- 마지막 기능 변경 커밋: `4a363ad14addd7f298e666a38085eb5df31b757d` — 선택 언어를 답변/읽기에 반영.
- 해당 Preview: `dpl_3ghKzQ69pgeQcWPAfRWjE7ikstgn`, READY 확인. 이 값은 당시 증거이며 다음 작업 시작 때 최신 HEAD/배포를 재확인한다.
- 단일 작업 주소: https://royal-command-ai-git-feat-indep-0be966-harry2park-afks-projects.vercel.app
- RC V3 `/rcv3`; Create Room `/rcv3/create`; 기존 RC `/rooms/rca`; Katie `/secretary`.
- **Production/master 변경 금지.** 현재 개발 중심은 RC V3. 기능 커밋이 최신이라는 것과 Harry가 승인한 안정 복원점이라는 것은 다르다. 복원은 `docs/COMMAND_ROOM_STABLE_BASELINE.md` 및 해당 작업 검증문서를 확인한다.

## 완료·제한을 혼동하지 말 것

| 영역 | 확인된 상태 | 다음 작업에서 주의할 점 |
|---|---|---|
| Create Room | 목적별 폼은 9월 19일 이미 구현. 이름→목적→질문, 초안 저장, 비서 연락처 질문, 쉬운 설명/Translate 추가 | 폼 엔진을 새로 만들지 말 것. 연락처 입력은 OAuth/전화 개통 완료가 아님 |
| 유료 룸 | 서버 결제 확인·동의·idempotent 생성·격리 코드 구현 | 승인된 가격/전체 약관/Stripe sandbox 설정 및 실제 sandbox 결제 검증은 미완료. 고객 유료 서비스 준비 완료 아님 |
| Katie 복사 | 기능과 개인 데이터 경계, 새 버튼 ID, Gmail 별도 opt-in 적용 | Harry 설정·계정·전화 연결 복제 금지. 고객 간 템플릿 배포 서비스는 미완료 |
| Gmail | 20개 제한 대신 페이지 순회/전체 받은메일 검토 경로, 연결 상태 검증 구현 | 마지막 실제 접속은 Google 토큰 만료/철회. 재인증 및 실제 전체메일 성공 확인 미완료. 자동 일일 감시 아님 |
| 스피커 | ON/OFF 별도 저장, 새 답변 자동 큐, OFF 시 대기 요청까지 취소. 실제 Preview 재생 및 새로고침 유지 확인 | 같은 브라우저/룸의 설정. 기기 간 동기화까지 구현했다고 말하지 말 것 |
| 답변 언어 | RC 저장 선택→계정 언어→가입 언어. 오래된 영어 UI 기본값은 한국어를 덮지 않음. 외국어 원문을 선택 언어로 읽도록 번역 | 새 영어 질문에 한국어 답변/재생 확인. 원래 대화는 보존. 마이크 인식 언어 설정까지 이번 수정으로 고쳤다고 말하지 말 것 |
| 설명 번역 | 영어 설명 끝 Translate, 가입/계정 언어 사용, 주요 안내에 적용 | 모든 기존 RC 문장을 자동 변환한 것은 아님. 답변/음성과 설명 번역 정책을 혼동하지 말 것 |
| 전화 | 기존 Katie 수신 연결 보존 원칙 | 새 고객 전화 개통/연동과는 별개. 기존 번호·음성·프롬프트·라우팅 임의 변경 금지 |

## 장기 방향·운영

Harry는 RC 웹사이트 제작과 이후 고객 업그레이드에 집중한다. 공통 Core + 검증된 기본방 + 고객별 설정/데이터 분리로 확장한다. 고객마다 새 프로그램을 만들지 않는다. 기존 `docs/RC_CORE_NUMBERING_AND_CLONE_POLICY.md`와 `src/lib/core/registry.ts`를 재사용한다.

한국어로 짧게 보고한다. 실행 요청은 가능한 범위까지 마무리하고 기존 승인 범위에서 반복 승인을 요구하지 않는다. 반대로 과거 특정 작업 승인을 Production/결제/외부 발송의 무제한 승인으로 확대하지 않는다. 사용자용 버튼 명칭은 쉬운 영어를 유지한다.

- [기능·코드·증거 지도](docs/continuity/FEATURE_MAP.md)
- [압축된 결정사항과 이전 요구](docs/continuity/DECISIONS.md)
- [작업 기록·인수인계](docs/continuity/SESSION_LOG.md)
