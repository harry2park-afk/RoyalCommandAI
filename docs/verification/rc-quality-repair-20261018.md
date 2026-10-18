# RC 검사 복구 — 2026-10-18

상태: **로컬 전체 Quality Gate 구성 검사 통과 / 실제 브라우저 회귀 통과**.
최종 원격 검사·정확한 소스 SHA·배포 ID·복원 대조 증거는 [PR #863](https://github.com/harry2park-afk/RoyalCommandAI/pull/863)에 기록한다. 이 문서 작성 시점의 로컬 성공을 원격 성공으로 간주하지 않는다.

## 작업 경계

- Harry의 “남은 오류를 수정하고 재검사해서 진행” 승인(2026-10-18)을 이어 수행했다.
- STANDARD, Writer `/root`, 독립 Reviewer `lint_repair_review`. 기존 학습·공통 컨트롤과 해당 검사 파일만 수정한다.
- 시작 소스 `9bddda03971d1a9e7070dc3a7986e6ff470465cd`, tree `7b0cd8075d2a1929dd9aebb6d1593d0111505682`.
- 기존 시험 브랜치 `work/rc-phase1-access-checks-20261018`, PR base `work/rcv3-provider-balance-20260929`. 실제 운영 master·V4 private Site·DB·결제·전화·고객 발송을 변경하지 않았다.
- 기존 1단계 권한 보호 수정과 검사 기준을 보존했다. 현재 전체 운영 승격 조건은 아래 미해결 항목 때문에 충족되지 않는다.

## 수정

1. 기존 오류 15개 해소: 4개 검사 파일의 `any`/`this` 별칭 13개를 실제 속성·이벤트 타입으로 교체했다. 기존 assertions를 제거하거나 약화하지 않았다.
2. 학습 복원: 서버와 최초 hydration에서는 같은 초기값을 사용하고, 브라우저 저장 내용을 고객·초기 언어·과정별로 한 번 읽는다. 저장 위치·질문 초안·과제·읽기 막대·대화 이력을 보존하며 일반 재렌더가 작성 중인 글을 다시 덮어쓰지 않는다. 일부 손상 자료 때문에 다른 정상 초안을 버리지 않는다. 새 고객으로 바뀌면 이전 초안·대화 상태를 초기화한다.
3. 번역: 실패 상태를 현재 날짜/과목 일차·언어·재시도·과정에 연결했다. 재시도와 언어 전환 시 지난 오류를 없애고, 취소한 요청의 늦은 응답은 반영하지 않는다.
4. 실제 브라우저 검사에서 Node/Chromium ICU의 한국어 국가명 차이(홍콩 표기)로 화면 hydration 실패를 재현했다. 기존 LearningRegion의 첫 표시를 일치시키고 이후 브라우저에서 선택 언어 국가명을 표시한다. 국가 ID·배경·가격·선택 동작은 보존한다.

새 화면·버튼·경로·유료 기능·의존성 추가 없음. 검사 설정/허용 기준/기존 suppressions 변경 없음.

## 검증 증거

| 실행 | 결과 |
|---|---|
| `npm ci --ignore-scripts --no-audit --no-fund` | 통과, 453 packages |
| 전체 V3 + 수정 코드 ESLint | 오류 0, 기존 경고 23 유지 |
| 전체 Vitest | **760개 통과**, 실패 0 |
| 기존 rcv3 Node 검사 | 16개 통과 |
| CI 변경 선택 + Domain Gate Node 검사 | 7개 통과 |
| Conflict Guard self-test | 통과 |
| TypeScript / Next.js production build | 통과 |
| 독립 검토 | PASS. 영향 검사 57개, 변경 후 29개, ICU 검사 3개 독립 실행 |
| 실제 Chromium SSR/StrictMode 회귀 | **8개 시나리오 통과**, hydration 오류 0, 페이지 오류 0, 외부 요청 0 |

브라우저 재현 명령: `node scripts/learning-recovery-smoke.mjs` (환경에 따라 `RC_TEST_CHROMIUM_PATH` 지정). 실제 LearningRoom·LearningRegion 컴포넌트를 사용하며 이미지 전송만 시험 구현으로 바꾸고 모든 API를 시험 응답으로 대체한다. 저장 학습/초안, 빈 칠판·이력 보존, 입력 보존, 번역 실패 후 언어 재방문, 재시도·취소, 읽기 위치, 고객 전환을 검증한다. 로그인된 배포 사이트·실제 음성·결제 성공 검증을 의미하지 않는다. 테스트용 서버/브라우저 환경 초기 실패를 통과로 세지 않았으며 최종 실행만 위 결과다.

구현 참고: [React 외부 저장소와 SSR](https://react.dev/reference/react/useSyncExternalStore), [React 상태와 effect](https://react.dev/learn/you-might-not-need-an-effect), 설치된 Next.js 서버/클라이언트 문서.

## 복구와 운영 제한

이전 소스·시험 배포를 보존한다. 새 소스 게시 후 해당 SHA를 임시 디렉터리에 복원하고 파일별 Git blob을 원본과 비교하여 PR에 증거를 남긴다. **소스와 저장소 기본 자산의 복구점**이며 Supabase DB·R2 디자인·브라우저 업로드·고객 자료·비밀 값·외부 서비스 설정 전체 복구는 아니다.

미해결: 고객 프로필의 관리자 권한 변경 보호, 로그인→동의→방 생성→시험 결제/30일 이용권→교육 전체 연결, 실제 음성/태블릿, 전체 고객 자료 복원. 기존 23개 lint 경고와 Next middleware deprecation도 남아 있다. 이 수정본의 검사 통과를 RC 전체 운영 준비 완료로 표시하지 않는다.
