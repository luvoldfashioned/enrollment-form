# 00. 총정리 및 면접 대비 가이드 (Master Summary)

본 문서는 프로젝트에 작성된 전체 기술 문서(01번 ~ 18번)를 아우르는 **마스터 인덱스(Index)**이자, 기술 면접 및 인수인계를 대비한 **핵심 요약 가이드**입니다.

---

## 📚 1. 전체 문서 목차 (Index)

문서들은 크게 [초기 환경 및 설계], [UI 및 기본 상태], [심화 구조 및 성능 최적화], [UX 고도화] 4단계로 구성되어 있습니다.

### [Phase 1. 프로젝트 초기 설계 및 환경 구축]

- `01_environment_and_msw.md` : Vite, TS 기반 환경 구축과 MSW를 통한 모킹 서버 전략
- `03_why_typescript_and_zod.md` : 왜 타입스크립트와 Zod 조합을 선택했는가에 대한 철학
- `09_zod_discriminated_union_guide.md` : 단체/개인 신청을 구분짓는 Zod 판별 유니온 설계
- `10_zod_refactoring_details.md` : Zod 유효성 검사 리팩토링 상세

### [Phase 2. UI 컴포넌트 및 기본 상태 관리]

- `02_form_state_and_validation.md` : React Hook Form을 이용한 폼 상태와 유효성 로직
- `04_ui_components_and_state.md` : 스텝별 UI 분리 및 전역 상태(Context) 통합 가이드

### [Phase 3. 성능 렌더링 최적화 및 리팩토링 (가장 중요 ⭐)]

- `13_refactoring_01_as_any_removal.md` : RHF 제네릭 통일을 통한 `as any` 제거
- `14_refactoring_02_debounced_autosave_hook.md` : `watch(callback)`을 통한 렌더링 0회 자동 저장(Auto-save) 구현
- `15_refactoring_03_headcount_handler.md` : `getValues`를 활용한 명단 동기화 시 의존성 무한 루프 버그 수정
- `16_refactoring_04_hooks_separation.md` : 비대해진 App.tsx의 비즈니스 로직을 커스텀 훅으로 관심사 분리(SoC)
- `18_feat_course_summary_with_query.md` : React Query 캐싱(Stale-while-revalidate)을 활용해 전역 상태 관리 툴을 대체한 방법

### [Phase 4. 사용자 경험(UX) 고도화]

- `08_ux_enhancements_detail.md` : 전반적인 폼 사용성 개선 내용
- `11_prevent_leave_guide.md` : 브라우저 닫기/새로고침 방지(beforeunload) 처리
- `12_localstorage_draft_guide.md` : 임시 저장 데이터 복구 시나리오
- `17_ux_error_banner_dismiss.md` : UX 향상을 위한 에러 배너 생명주기 관리 및 초기화 로직

---

## 🎯 2. 기술 면접 대비 핵심 Q&A (주니어~미들 레벨)

이 프로젝트를 리뷰하는 면접관은 '코드의 구현 여부'보다 **'왜 이렇게 구현했는지(Why)'**를 집중적으로 파고들 것입니다.

### Q1. React Hook Form(RHF)에서 렌더링 최적화는 어떻게 했나요?

**A.** 로컬스토리지 자동 저장(Auto-save) 기능을 만들 때 가장 주의했습니다.
보통 `watch()`를 쓰면 입력값이 바뀔 때마다 폼 컴포넌트 전체가 다시 렌더링됩니다. 이를 막기 위해 `watch(callback)` 형태의 구독(Subscription) 패턴을 커스텀 훅(`useFormDraftPersistence`)으로 분리했습니다.
이로 인해 **렌더링을 단 한 번도 발생시키지 않으면서도 백그라운드에서 300ms 디바운스로 안전하게 데이터를 저장**할 수 있도록 최적화했습니다.

### Q2. Redux 같은 전역 상태 관리 라이브러리를 안 쓴 이유가 있나요?

**A.** 프론트엔드의 상태를 UI(클라이언트) 상태와 서버 상태로 나누어 접근했습니다.
폼 입력값이나 현재 스텝 같은 UI 상태는 React Hook Form의 `FormProvider`로 충분히 커버가 가능했고,
가장 골칫거리인 서버 데이터(강의 목록 등)는 **React Query의 캐싱 메커니즘**을 적극 활용했습니다. 1단계와 2단계, 3단계 컴포넌트에서 동일한 `queryKey: ['courses', 'all']`을 호출하게 함으로써 네트워크 중복 요청 없이 완벽하게 서버 상태를 전역으로 공유해 내어 불필요한 라이브러리 도입을 막았습니다.

### Q3. Zod 스키마에서 `discriminatedUnion`을 왜 썼나요?

**A.** 다단계 폼의 특성상 신청 유형('개인' vs '단체')에 따라 요구하는 데이터 스펙이 완전히 달라집니다.
단순 `z.object`로 묶으면 '단체명'이나 '참가자 명단' 필드가 개인 신청일 때 필수인지 선택인지 모호해져 런타임 에러가 터질 확률이 높습니다.
`discriminatedUnion`으로 두 가지 스키마를 분기함으로써, 런타임 방어벽은 물론이고 **TypeScript 컴파일 타임에 타입 추론(Type Guard)이 완벽하게 일치**하도록 설계적 안정성을 높였습니다.

### Q4. `App.tsx`가 비대해지는 문제를 어떻게 리팩토링했나요?

**A.** 단일 책임 원칙(SRP)과 관심사 분리(SoC)를 적용했습니다.
에러가 났을 때 해당 인풋으로 스크롤을 이동시키는 로직(`useFocusOnError`), 사용자 이탈을 막는 로직(`usePreventLeave`), 자동 저장 로직(`useFormDraftPersistence`) 등 모든 부수 효과(Side Effect)들을 각각의 커스텀 훅으로 분리했습니다. 그 결과 `App.tsx`는 "무엇을 그릴 것인가(UI)"에만 집중할 수 있게 되어 유지보수성이 극대화되었습니다.
