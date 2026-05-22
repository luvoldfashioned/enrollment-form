# 3단계 리팩토링: `headCount` 이벤트 핸들러 충돌 및 명단 동기화 루프 수정

이 문서에서는 `Step2StudentInfo.tsx` 컴포넌트 내의 두 가지 구조적 결함인 **(1) React Hook Form의 `onChange` 이벤트 오버라이드 충돌 버그**와 **(2) `useFieldArray` 동기화 이펙트의 `fields.length` 의존성 순환 루프**를 진단하고 이를 해결한 내역을 상세히 설명합니다.

---

## 1. 도입 이유 (왜 변경했는가?)

### A. `headCount` 입력 이벤트 핸들러 충돌 버그
이전 코드에서는 단체 신청 인원수(`group.headCount`) 인풋 필드를 다음과 같이 등록했습니다.
```typescript
<input
  type="number"
  {...register('group.headCount', { valueAsNumber: true })}
  onChange={(e) => {
    const val = Number(e.target.value);
    setValue('group.headCount', val, { shouldValidate: true });
  }}
/>
```
* **문제점**: React Hook Form(이하 RHF)의 `register(...)` 함수는 `{ name, onChange, onBlur, ref }`와 같은 속성이 담긴 객체를 반환하며, 이를 JSX input에 spread(`...`) 연산자로 주입합니다.
* 그러나 그 바로 뒤에 `onChange={...}` 속성을 따로 정의하면, **앞서 spread로 주입된 RHF의 `onChange` 함수를 커스텀 `onChange` 함수가 덮어써서(Overwrite) 완전히 비활성화**시킵니다.
* 결과적으로 RHF 내부에서 관리되는 데이터 파싱 규칙(`valueAsNumber: true`)이나 내부 폼 값 추적 상태 갱신이 동작하지 않아, RHF 내부 폼 값에 문자열로 들어가거나 `dirtyFields`, `touchedFields` 등의 상태 추적에 오동작을 초래할 수 있었습니다.

### B. `useFieldArray` 동기화 `fields.length` 순환 문제
인원 수 변경에 따른 참가자 입력 행(Row) 개수를 맞추는 useEffect의 의존성 배열에 `fields.length`가 명시되어 있었습니다.
```typescript
useEffect(() => {
  // ... append() 또는 remove() 수행
}, [headCount, enrollmentType, append, remove, fields.length]);
```
* **문제점**: 이펙트 블록 내부에서 `append` 및 `remove`를 호출하면 `fields` 배열의 크기가 변화합니다. 이로 인해 의존성 배열에 등록된 `fields.length`가 다시 바뀌어 이펙트가 재실행되는 **의존성 순환(Dependency Loop)**을 형성합니다.
* 다행히 최소 2명, 최대 10명이라는 조건 분기(`count >= 2 && count <= 10`)와 길이가 일치할 때 조기 반환하는 가드가 설정되어 무한 루프로 뻗지는 않았으나, 폼 필드가 추가/제거될 때 불필요하게 이펙트가 반복 기동되는 비효율적이고 잠재적으로 위험한 구조였습니다.

---

## 2. 코드 변경 내역 (Before vs After)

### ① `headCount` onChange 병합

#### **[Before]**
```typescript
<input
  id="headCount"
  type="number"
  {...register('group.headCount', { valueAsNumber: true })}
  onChange={(e) => {
    const val = Number(e.target.value);
    setValue('group.headCount', val, { shouldValidate: true });
  }}
/>
```

#### **[After]**
```typescript
// 컴포넌트 상단에서 register 반환 객체 저장
const headCountRegister = register('group.headCount', { valueAsNumber: true });

// ...

<input
  id="headCount"
  type="number"
  {...headCountRegister}
  onChange={async (e) => {
    // 1) RHF의 기본 onChange 동작을 수동으로 먼저 호출하여 타입 캐스팅 및 상태 관리가 원활히 되게 함
    await headCountRegister.onChange(e);
    // 2) 커스텀 로직 실행 (인원 수에 의거해 RHF 밸리데이션을 강제 트리거)
    const val = Number(e.target.value);
    setValue('group.headCount', val, { shouldValidate: true });
  }}
/>
```

---

### ② `useFieldArray` 동기화 로직 의존성 분리

#### **[Before]**
```typescript
useEffect(() => {
  if (enrollmentType === 'group') {
    const count = Number(headCount) || 0;
    const currentLength = fields.length; // useFieldArray fields의 length를 이펙트 내부에서 참조

    if (count >= 2 && count <= 10) {
      if (count > currentLength) {
        for (let i = currentLength; i < count; i++) {
          append({ name: '', email: '' });
        }
      } else if (count < currentLength) {
        for (let i = currentLength - 1; i >= count; i--) {
          remove(i);
        }
      }
    }
  }
}, [headCount, enrollmentType, append, remove, fields.length]); // fields.length 의존성 포함
```

#### **[After]**
```typescript
useEffect(() => {
  if (enrollmentType === 'group') {
    const count = Number(headCount) || 0;
    // RHF의 getValues()를 사용하여 실시간으로 현재 저장된 참가자 명단 배열의 크기를 탐색
    const currentParticipants = getValues('group.participants') || [];
    const currentLength = currentParticipants.length;

    if (count >= 2 && count <= 10) {
      if (count > currentLength) {
        for (let i = currentLength; i < count; i++) {
          append({ name: '', email: '' });
        }
      } else if (count < currentLength) {
        for (let i = currentLength - 1; i >= count; i--) {
          remove(i);
        }
      }
    }
  }
  // getValues 함수는 RHF가 제공하는 불변 레퍼런스이므로 무한 루프를 유발하지 않으며,
  // fields.length를 의존성에서 배제하여 의존성 순환 관계를 완전히 차단함.
}, [headCount, enrollmentType, append, remove, getValues]);
```

---

## 3. 주니어 개발자를 위한 요약 노트

1. **RHF `register`의 원리**:
   * `register('fieldName')`는 단순히 마법 같은 일을 하는 게 아니라, `{ name, onChange, onBlur, ref }`라는 일반 React Props 객체를 생성하는 도구입니다.
   * JSX 상에서 다른 Props와 마찬가지로 덮어씌우기를 주의해야 합니다. 커스텀 핸들러가 필요하다면, 반드시 구조분해한 뒤 RHF의 핸들러를 수동으로 위임 호출(Delegation)해 주는 형태로 병합해야 안전합니다.
2. **이펙트 내의 상태 갱신과 의존성 배열**:
   * `useEffect` 안에서 특정 배열 상태(예: `fields`)의 길이를 수정(`append`, `remove`)하는데, 그 길이를 유발하는 트리거 의존성에 다시 `fields.length`를 포함하면 로직의 결함(무한 순환)이 생기기 쉽습니다.
   * 이때 **의존성을 해치지 않으면서 최신 데이터를 읽는 수단(RHF의 `getValues()` 또는 React `useRef` 등)**을 활용하여 횡적 순환 관계를 영리하게 차단해야 합니다.
