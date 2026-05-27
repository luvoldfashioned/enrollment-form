# 2단계 리팩토링: `watch()` 전체 구독 해제 및 Auto-save 훅 분리

이 문서에서는 다단계 수강 신청 폼의 치명적인 성능 병목이었던 `watch()` 전체 구독에 의한 과도한 컴포넌트 리렌더링 문제를 진단하고, 이를 **이벤트 구독 방식의 커스텀 훅**으로 분리 및 고도화한 내역을 상세 설명합니다.

---

## 1. 도입 이유 (왜 변경했는가?)

### A. 기존 코드의 문제점

이전 구현에서는 `App.tsx` 최상단에서 다음과 같이 폼 값을 구독했습니다.

```typescript
const currentFormValues = watch(); // 매 타이핑마다 App.tsx 전체 및 하위 모든 Step 컴포넌트 리렌더링 유발!
```

- React Hook Form(이하 RHF)의 `watch()`를 인자 없이 본문에서 실행하면, RHF는 해당 컴포넌트를 이 폼의 모든 상태 변경에 대해 리렌더링하도록 등록합니다.
- 이에 따라 사용자가 이름, 이메일, 수강동기 등을 한 글자 입력할 때마다 App 컴포넌트 전체가 매번 재평가(Re-evaluation) 및 가상 돔 비교를 수행하게 되며, 이는 타이핑 반응 속도를 저하시키는 큰 성능 낭비입니다.
- 또한, localStorage와 관련된 폼 상태 저장 및 복구(Auto-save) 로직이 App 컴포넌트에 직접 하드코딩되어 코드가 방대해지고 단일 책임 원칙(Single Responsibility Principle)을 어겼습니다.

### B. 변경 후 해결책

1. **`watch(callback)`을 통한 이벤트 구독 방식**: RHF의 `watch` 메서드는 첫 번째 인자로 콜백 함수를 전달할 수 있습니다. `watch((values) => { ... })` 형태로 호출하면, **컴포넌트 리렌더링을 전혀 트리거하지 않고** 백그라운드에서 값 변경 통지만 구독(Subscription)할 수 있습니다.
2. **관심사 분리 (Separation of Concerns)**: 로컬스토리지 초안 로딩, 300ms 디바운스 자동 저장 로직을 `useFormDraftPersistence`라는 독립적인 커스텀 훅으로 추출하였습니다. 이로써 `App.tsx`는 폼 전체 흐름 제어에만 집중하고, 로컬스토리지 관련 세부 구현 내용은 훅 내부로 격리되었습니다.

---

## 2. 코드 변경 내역 (Before vs After)

### ① `App.tsx` 성능 개선 및 훅 도입

#### **[Before]**

```typescript
function App() {
  // ...
  const hasInitiatedDraft = useRef(false);

  // 1) 초안 복구
  useEffect(() => {
    // ... window.confirm 및 reset
  }, [reset]);

  // 2) 폼 실시간 감시 (리렌더링 병목 지점!)
  const currentFormValues = watch(); 

  // 3) 300ms 디바운스 자동 저장
  useEffect(() => {
    // ... localStorage.setItem
  }, [currentFormValues, step, submitResult]);
  
  // ...
}
```

#### **[After]**

```typescript
import { useFormDraftPersistence } from './hooks/useFormDraftPersistence';

function App() {
  // ...
  
  // 단 한 줄의 커스텀 훅 호출로 복구 및 자동 저장 로직 캡슐화! (리렌더링 없음)
  useFormDraftPersistence(methods, step, setStep, submitResult);

  // ...
}
```

---

### ② `useFormDraftPersistence` 커스텀 훅 설계 상세

#### **[After] (신규 생성)**

```typescript
export function useFormDraftPersistence(
  methods: UseFormReturn<EnrollmentFormInput>,
  step: number,
  setStep: (step: number) => void,
  submitResult: any
) {
  const { watch, reset } = methods;
  const hasInitiatedDraft = useRef(false);

  // 초안 복구 로직 (마운트 시 1회만 동작)
  useEffect(() => {
    // ... 로컬스토리지 데이터를 가져와 confirm 확인 후 복구
  }, [reset, setStep]);

  // 비-리렌더링 이벤트 구독 패턴을 활용한 디바운스 저장 로직
  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout>;

    // watch의 콜백 인자는 리렌더를 일으키지 않고 값의 흐름만 수신합니다.
    const subscription = watch((value) => {
      if (submitResult) return;

      const hasAnyContent =
        value.courseId || value.name || value.email || value.phone || value.motivation;
      if (!hasAnyContent) return;

      if (saveTimer) clearTimeout(saveTimer);

      saveTimer = setTimeout(() => {
        localStorage.setItem('enrollment_form_draft', JSON.stringify(value));
        localStorage.setItem('enrollment_form_draft_step', String(step));
      }, 300);
    });

    // Cleanup: 컴포넌트 언마운트 또는 의존성 변경 시 구독 해제 및 타이머 취소로 메모리 누수 원천 방지
    return () => {
      subscription.unsubscribe();
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, [watch, step, submitResult]);
}
```

---

## 3. 성능 비교 및 분석

| 비교 항목 | 기존 방식 (watch()) | 개선된 방식 (watch(callback)) |
|:---|:---|:---|
| **입력 시 리렌더링 범위** | **App 전체 + 모든 Step 자식 컴포넌트**가 매 입력마다 리렌더링 | 해당 입력 필드의 **개별 Input 컴포넌트**만 리렌더링 |
| **렌더링 수** | 사용자가 10글자 입력 시 최소 **10회 이상**의 최상위 리렌더링 발생 | 사용자가 10글자 입력 시 최상위 리렌더링 **0회** |
| **메모리 / 타이머 누수 위험** | 매 리렌더링마다 디바운스 타이머가 클리어되고 재생성됨 | 오직 내부 타이머만 갱신되며, 리렌더에 구애받지 않고 안전하게 디바운싱 |

---

## 4. 주니어 개발자를 위한 요약 노트

- `watch()`는 편리하지만 대규모 폼이나 잦은 변경이 있는 폼에서는 심각한 성능 병목을 발생시킬 수 있습니다.
- 화면 리렌더링 없이 **백그라운드 처리(예: 자동 저장, API 동기화 등)를 할 때는 콜백을 인자로 넘기는 `watch(callback)` 형태**를 사용하는 것이 핵심 모범 사례입니다.
- 복잡한 폼 제어 생명주기와 비즈니스 로직(초안 저장/복구 등)은 최상위 UI 컴포넌트에서 분리하여 **커스텀 훅으로 캡슐화**하는 것이 유지보수와 성능 관리 면에서 정석입니다.
