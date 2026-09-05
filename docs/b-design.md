# B 범위 설계안 (구현 제외)

상태: **Proposed**. 이 문서는 A 구현과의 경계를 명확히 하기 위한 설계
산출물이며, Redis, Spring Security, API Gateway, 프론트엔드 변경은 이 브랜치에서
구현하지 않는다. Kafka와 Kubernetes/Helm은 명시적으로 제외한다.

## Redis 캐싱

- 공고 목록 키: `bids:list:v1:{category}:{region}:{page}`, TTL 1시간
- 공고 상세 키: `bids:detail:v1:{bidId}`, TTL 24시간
- 나라장터 동기화가 성공적으로 끝난 뒤에만 목록 키를 무효화한다.
- 인증·권한 결과와 AI 예측 결과는 사용자/모델 버전 구분 없이 캐시하지 않는다.

## Spring 보안 강화

- `/api/auth/**`만 익명 접근을 허용하고, 나머지는 JWT 인증을 요구한다.
- `USER`, `ADMIN` 역할을 API 경계에서 검증하며 관리자 라우트는 별도 테스트한다.
- 현재 공개된 자격증명은 교체하고, 환경변수 또는 배포 플랫폼의 secret store로만
  주입한다. 코드와 Git 이력에 남아 있는 값은 재사용하지 않는다.

## 관측성

- 서비스 공통: request count, P50/P95/P99 latency, error rate, dependency failure.
- AI 추가: model version, prediction latency, retrieval MRR@5, corpus version.
- 대시보드는 API, AI, 데이터 파이프라인으로 분리하며 사용자 식별값과 공고 원문은
  metric label에 넣지 않는다.

## 프론트엔드

- 서버 상태는 React Query, 화면 전용 상태는 Zustand로 구분한다.
- 공고 상세에는 AI 결과, 모델 버전, 근거 문서 출처와 "참고용" 안내를 인라인으로 표시한다.
- 알림은 기존 폴링을 유지한 채 API 계약을 먼저 고정하고, WebSocket 전환은 별도 변경으로 분리한다.

## API Gateway

- 외부 경계는 `/api`(Spring), `/ai`(AI API), `/chat`(챗봇)로 유지한다.
- Gateway 구현 시에만 TLS 종료, 요청 크기 제한, rate limit, request ID 전달을 적용한다.
- Gateway 도입 전에도 각 서비스의 CORS와 인증 경계를 독립적으로 검증한다.
