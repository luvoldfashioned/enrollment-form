# 4단계 리팩토링: `beforeunload` 및 `focusOnError` 로직 커스텀 훅 분리

이 문서에서는 최상위 `App.tsx` 컴포넌트의 가독성을 높이고 관심사를 격리하기 위해, **(1) 페이지 이탈 방지(`beforeunload`) 로직**과 **(2) 유효성 에러 오토포커스 및 스크롤 이동 로직**을 독립된 커스텀 훅으로 각각 추출 및 리팩토링한 내용을 상세 설명합니다.

---

## 1. 도입 이유 (왜 변경했는가?)

### A. App.tsx 컴포넌트 비대화

* 이전 구현에서는 최상위 `App.tsx`가 폼 전체 상태 관리(React Hook Form), 렌더링, API 요청 제어는 물론이고 페이지 이탈 감지 이벤트 바인딩과 중첩된 폼 에러 객체를 순회해 DOM 요소를 탐색하는 복잡한 UI 포커스 기능까지 모두 처리하고 있었습니다.
* 이로 인해 `App.tsx`가 약 400줄을 상회하는 규모로 거대해졌으며, 단일 책임 원칙(Single Responsibility Principle) 측면에서 코드 유지보수성이 저하되었습니다.

### B. 관심사 분리를 통한 가독성/재사용성 극대화

1. **페이지 이탈 방지 (`usePreventLeave`)**: 폼이 수정 상태(`isDirty`)이고 최종 제출이 아직 완료되지 않았을 때만 브라우저 이탈 경고 다이얼로그를 띄워주는 이벤트 관리 책임입니다. 이를 `usePreventLeave` 훅으로 묶어 완전히 독립시켰습니다.
2. **에러 필드 오토포커싱 (`useFocusOnError`)**: 에러 오브젝트(`FieldErrors`)를 파싱하여 최상단 에러 발생 경로에 스무스 스크롤링 및 포커싱을 넣어주는 순수 헬퍼성 DOM 관리 책임입니다. 이를 `useFocusOnError` 훅으로 추출하였습니다.

---

## 2. 코드 변경 내역 (Before vs After)

### ① 페이지 이탈 방지 처리 분리

#### **[Before]** (`App.tsx` 내의 인라인 구현)

```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty && !submitResult) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [isDirty, submitResult]);
```

#### **[After]** (커스텀 훅 적용)

```typescript
// App.tsx
usePreventLeave(isDirty, !!submitResult);
```

---

### ② 에러 포커싱 & 스무스 스크롤 처리 분리

#### **[Before]** (`App.tsx` 내의 인라인 구현)

```typescript
const focusAndScrollToError = () => {
  setTimeout(() => {
    const { errors } = methods.formState;
    const getFirstErrorKey = (obj: any, path = ''): string | null => { ... };
    const firstErrorPath = getFirstErrorKey(errors);
    if (!firstErrorPath) return;
    const errorElement = document.querySelector(`[name="${firstErrorPath}"]`) as HTMLElement;
    if (errorElement) {
      errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => { errorElement.focus(); }, 300);
    }
  }, 0);
};
```

#### **[After]** (커스텀 훅 적용)

```typescript
// App.tsx
const focusAndScrollToError = useFocusOnError(errors);
```

---

## 3. 주니어 개발자를 위한 요약 노트

1. **관심사 분리 (Separation of Concerns)**:
   * 리액트 컴포넌트는 UI 렌더링에만 집중하는 것이 이상적입니다.
   * 비즈니스 로직(예: localStorage 저장)이나 외부 시스템 동기화(예: window 이벤트 리스너 바인딩, DOM 제어)는 커스텀 훅으로 감싸는 것이 관심사 분리의 핵심 원칙입니다.
2. **이벤트 리스너 청소(Cleanup)**:
   * `window.addEventListener`를 활용할 때는 컴포넌트가 사라지거나 의존성이 변경될 때 반드시 `removeEventListener`를 수행해 주어야 메모리 누수를 막을 수 있으며, 이는 커스텀 훅 내부의 `useEffect` 반환부(Cleanup 함수)를 통해 완벽히 제어됩니다.
