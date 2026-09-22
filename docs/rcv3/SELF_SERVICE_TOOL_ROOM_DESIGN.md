# RC 고객 직접 구성형 툴방 — 승인 설계 v1.0

결정일: 2026-09-21. Owner: Harry Park.
상태: 고객이 직접 구성하는 방향과 아래 원칙 승인. 이 문서는 구현 완료 증거가 아니다.
적용 범위: Room 생성 폼, 공통 툴방, 툴 설치·사용·결제·제거.
상위 기준: ROYAL_COMMAND_LAW.md. 기존 Core/복제 정책을 보완하며 대체하지 않는다.

## 핵심 원칙
- 100여 국가의 고객마다 코드를 새로 만들지 않는다. 공통 Core, 검증된 툴, 국가별 설정을 사용한다.
- 고객이 폼에서 선택하면 고객 전용 방에 툴을 자동 배치한다. 이후 툴방에서도 추가한다.
- 툴은 버튼 그림만이 아니라 디자인, 실제 기능, 설정, 권한, 가격/이용권, 버전, 연결 조건을 함께 가진다.
- 기존 버튼 편집, AI Helper, 방 및 연결 기능을 먼저 조사하여 재사용한다.
- 고객 인증이 필요한 외부 계정은 고객이 직접 인증한다. Harry의 계정·전화·토큰을 복제하지 않는다.
- 유료 툴도 결제 전에 방에 붙일 수 있다. 결제 필요 상태로 표시하고 실행은 서버에서 차단한다.
- 서버가 결제 및 연결 조건을 확인해야 활성화한다. 브라우저의 결제 성공 표시만으로 활성화하지 않는다.
- 결제 만료, 일시 중지, 연결 오류가 생겨도 툴의 위치·크기·디자인·설정은 유지한다.
- 고객이 명시적으로 제거하기 전까지 자동 삭제하지 않는다.
- 고객·조직·방별 데이터, 연결 자격증명, 이용권과 사용량을 분리한다.

## 설치 상태와 이용 상태는 별도로 관리
| 상황 | 방에 표시 | 실행 |
|---|---|---|
| 무료 툴 설치, 연결 준비 완료 | 유지 | 가능 |
| 유료 툴 결제 대기 | 결제 필요 표시 | 차단 |
| 결제 및 연결 준비 완료 | 유지 | 가능 |
| 구독 취소, 잔여 이용기간 있음 | 종료 예정 표시 | 해당 이용기간까지 가능 |
| 이용기간 만료 | 위치 그대로, 갱신 안내 | 차단 |
| 연결 장애 | 위치 그대로, 연결 복구 안내 | 연결 복구 전 차단 |
| 고객이 제거 | 방에서 제거 | 해당 설치에서 차단 |

제거, 구독 취소, 고객 데이터 삭제는 별도 동작이다. 제거 전 남아 있는 결제 여부와 구독 관리 경로를 알린다.
제거만으로 구독이나 고객 데이터를 몰래 삭제하지 않는다. 재설치 시 복원 가능 범위와 데이터 보관정책은 구현 전에 명시한다.
중복 클릭/결제 이벤트 재전송으로 중복 설치·중복 과금·중복 활성화가 발생하지 않도록 한다.

## 고객 화면
- 폼은 위에서 아래 순서로 표시한다. 가로 탭 및 Next로 강제 이동시키지 않는다.
- 필요한 선택 기능만 고르고 나머지는 지나갈 수 있다. 필수 정보는 명확히 표시한다.
- 전체 안내와 어려운 기능 설명 끝에 Translate 버튼을 제공한다.
- 툴방에는 설명, 미리보기, 가격/이용 조건, 방에 추가 기능을 제공한다.
- 설치된 툴에는 해당 상태에 맞는 설정, 결제, 연결 복구, 구독 관리, 제거를 제공한다.
- 기존 버튼 편집으로 위치·크기·모양을 바꾸며, 비활성화해도 편집 설정은 유지한다.
- 국가별 언어·통화·세금·서비스 제공 여부는 공통 국가 설정으로 적용한다. 모든 국가의 서비스가 준비되었다고 가정하지 않는다.

## 구현할 공통 구성요소
1. Tool Registry: 안정된 toolId, 버전, 기능·UI 진입점, 설정 규격, 국가 지원, 가격/권한, 연결 조건.
2. Tool Installation: 고객/조직/roomId/installationId/toolId, 버전, 위치·디자인·설정, 설치/제거 상태.
3. Entitlement: 고객의 결제 및 무료 이용권, 유효기간, 사용 한도. 설치 상태와 분리.
4. 실행 검증: 서버가 고객 권한·소유권·이용권·연결 상태를 매 실행에 검사.
5. 활성화 처리: 검증된 결제 이벤트, 재시도, 중복 방지, 실패 복구. 실패해도 툴은 보존.
6. 셀프서비스 관리: 고객 스스로 추가·수정·결제·복구·취소·제거.

이는 목표 설계이며 새 테이블/API가 이미 존재한다는 뜻이 아니다. 기존 registry, room, checkout, connector 코드를 대조한 뒤 최소 확장한다.

## 최소 실행 순서 및 완료 증거
- [ ] 기존 코드·규칙 대조: 재사용 가능/누락/충돌을 경로와 함께 기록.
- [ ] 첫 툴 선정 및 기존 화면/버튼 편집과 연결.
- [ ] 설치 → 결제 대기 → 서버 확인 → 실행 경로 검증.
- [ ] 만료/연결 실패 시 위치·설정 유지 및 복구 검증.
- [ ] 제거·구독 취소·데이터 삭제 구분, 다른 고객 접근 차단 검증.
- [ ] 동일 규격으로 두 번째 툴을 추가하여 재사용성 검증.
- [ ] 지원 국가별 조건을 검증한 범위부터 확대.

현재 구현 상태: 위 통합 수명주기 전체는 미완료. 기존 세로 폼·설명 번역·일부 Helper/결제 기반의 존재가 툴방 전체 완성을 뜻하지 않는다.
개발은 PR #748 Preview branch에서 진행한다. Production/master 변경, 실제 결제 또는 외부 발송 권한을 이 문서로 확대하지 않는다.

## 이 문서를 찾는 위치
AGENTS.md는 관련 개발 시 이 기준을 확인하도록 연결한다. RC_MEMORY.md는 새 작업 인수인계 색인으로 연결한다.
이 문서가 설계의 단일 기준이며 변경 시 결정일·내용·구현 증거를 갱신한다. 관련 없는 작업에 추가 심사나 반복 확인을 요구하지 않는다.

## 필수 개발 규칙 — 툴박스 우선 등록·재사용 (2026-09-21 보강)

Owner: Harry Park. RC V3부터 모든 신규·수정 화면, 방, 버튼 및 실행 기능에 적용한다.

1. 기존 버튼과 실제 작동 기능을 먼저 전수 조사한다. 각 항목의 원본 코드, 실행 경로, 연결 조건, 검증 결과를 목록으로 관리하고 공통 툴박스에 등록한다. 미등록·미검증 항목은 누락 목록으로 명시하며 전체 수록 완료로 보고하지 않는다.
2. 툴은 버튼 모양만 복사하는 것이 아니다. UI, 실제 실행 기능, 설정 규격, 권한, 버전, 필요한 연결 및 이용 조건을 하나의 재사용 단위로 등록한다. AI Helper, 읽어주기, 복사, 마이크, 전송 등 기존 공통 기능도 조사 대상에 포함한다.
3. 화면이나 방을 만들 때는 반드시 툴박스의 검증된 항목을 먼저 찾아 가져와 사용한다. 같은 기능을 방마다 별도 코드로 다시 만들지 않는다. 고객별 차이는 위치·크기·색상·이름·설정으로 처리한다.
4. 필요한 기능이 없으면 공통 재사용 기능으로 개발하여 툴박스에 먼저 등록하고 실제 작동을 검증한 뒤 화면이나 방에 가져와 사용한다. 화면에 먼저 별도 구현하고 툴박스 등록을 뒤로 미루지 않는다.
5. 복사는 검증된 공통 코드/기능 참조와 고객별 설치·설정 생성을 뜻한다. 고객 데이터·대화·비밀키·계정 연결·이용권을 복제하지 않는다. 외부 인증이나 결제가 필요한 기능은 해당 고객의 조건 충족 후 실행한다.
6. 각 등록 항목은 버튼 클릭부터 실제 결과까지 연결되어야 한다. 준비된 항목은 추가 후 바로 사용할 수 있어야 하며, 미연결·미결제·오류 상태는 명확히 표시한다. 동작하지 않는 장식 버튼을 사용 가능으로 등록하지 않는다.
7. 완료 증거에는 툴 ID/버전, 공통 원본 경로, 사용하는 화면·방, 실제 실행 및 필요한 실패 상태 검증을 남긴다. 동일 툴을 다른 방에서도 재사용할 수 있음을 확인한다. 공유 기능 수정은 공통 원본에서 처리하고 관련 사용처만 검증한다.

이번 보강은 개발 규칙의 저장이다. 기존 모든 버튼의 등록이나 공통 툴박스 구현·배포가 완료됐다는 뜻은 아니다. 기존 구현 상태 및 미완료 체크리스트는 그대로 유효하다.


## Owner correction — RC-managed toolbox (2026-09-22, takes precedence)

Harry directs that RC manages the toolbox under his authorization. Customers do not access the toolbox or install directly. Their AI can prepare a request identifying the function, purpose and destination; only an authorized RC process may apply an approved installation. Customer room ownership is not RC toolbox authority. An AI answer, customer approval flag, paid entitlement or developer task approval for a different scope is not installation approval. Existing supplied features and visual arrangement remain usable. Earlier self-service installation text above is superseded by this correction.

Current implementation: RC owner-only toolbox visibility, protected exact installation grants and state API installation checks. Customers submit text through Request a Tool; RC Requests lists protected requests for Harry to approve, reject or retry installation in the requested customer room. AI conversation alone does not submit a request. Paid service entitlements remain separately enforced. These code paths require Preview verification before being reported as operational.

### Approved email boundary

Email Review is an RC-owned toolbox function. Ordinary customers cannot draft or approve RC broadcasts. Card reminders use verified payment records and fixed factual templates. Every other outbound notice is a pending exact message until Harry approves its recipient and contents. The development task's standing approval does not approve customer communications. See `EMAIL_DELIVERY_STATUS.md` for implemented behavior and remaining delivery configuration.
