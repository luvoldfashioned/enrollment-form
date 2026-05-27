# 페이지 이탈 방지 경고 기능 개발 가이드 (Prevent Page Departure Warning)

본 문서는 수강 신청 폼 작성 중 실수로 페이지를 새로고침하거나 브라우저 창을 닫아 데이터가 날아가는 사고를 막기 위해 구현된 **페이지 이탈 방지(`beforeunload`)** 기능에 대해 주니어 개발자의 시선에서 쉽게 설명합니다.

---

## 1. 페이지 이탈 방지란 무엇인가요?

사용자가 열심히 폼을 입력하고 있는 와중에 실수로 브라우저의 **새로고침(F5)** 키를 누르거나, **뒤로가기** 버튼을 클릭하거나, 브라우저 **탭을 닫으려고** 할 때가 있습니다. 이 경우 React의 상태값들이 통째로 초기화되어 기껏 쓴 내용이 날아가게 됩니다.
이를 막기 위해 브라우저가 제공하는 표준 이벤트인 `beforeunload`를 구독(Subscribe)하여, 사용자에게 정말 페이지를 떠날 것인지 묻는 경고 대화창을 띄우는 것이 이 기능의 골자입니다.

---

## 2. 핵심 구현 아키텍처

우리는 최상위 `App.tsx`에서 이 기능을 전역적으로 제어하도록 구현했습니다.

### ① `isDirty` 감지

* React Hook Form이 제공하는 `formState.isDirty` 플래그를 사용합니다.
* `isDirty`는 사용자가 폼의 필드를 **하나라도 변경(수정)했는지 여부**를 나타내는 불리언(`boolean`) 값입니다.
* 만약 사용자가 데이터를 입력했다가 다시 원래대로(초기값 상태로) 되돌려 놓으면 자동으로 `false`가 됩니다.
* 단순히 "현재 입력란에 글자가 들어있는가?"를 체크하는 하드코딩 방식보다 훨씬 정교하고 안전하게 수정 유무를 판단해줍니다.

### ② `submitResult` 확인

* 사용자가 성공적으로 수강 신청을 마쳤다면 완료 화면(`submitResult`가 존재할 때)으로 이동하게 됩니다.
* 이때는 데이터를 잃어버리는 것이 아닌 정상 종료 상황이므로 브라우저 이탈 경고창이 **절대 뜨지 않아야** 합니다.
* 따라서 `!submitResult`라는 차단 조건을 결합해 줍니다.

---

## 3. 코드 해설

`App.tsx`에 추가된 핵심 코드 블록입니다.

```typescript
// 1) React Hook Form의 formState에서 isDirty 구조분해
const { trigger, getValues, handleSubmit, reset, formState: { isDirty } } = methods;

// 2) beforeunload 이벤트를 제어하는 useEffect
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    // 폼이 변경되었고(isDirty), 아직 신청 완료 상태가 아닐 때만 이탈 방지 작동
    if (isDirty && !submitResult) {
      e.preventDefault();
      e.returnValue = ''; // 모던 브라우저에서 기본 경고창을 띄우기 위한 표준 스펙
    }
  };

  // 브라우저 윈도우 객체에 이벤트 등록
  window.addEventListener('beforeunload', handleBeforeUnload);

  // 3) Cleanup 패턴: 컴포넌트가 언마운트되거나 의존성이 변경될 때 리스너를 정리해줍니다.
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [isDirty, submitResult]); // 의존성 배열에 등록하여 최신 상태 변화에 즉각 대응
```

### 💡 주니어 개발자를 위한 React Tip: Cleanup (정리) 패턴

`window.addEventListener`를 통해 브라우저 전역에 이벤트를 등록했다면, 반드시 `return () => { window.removeEventListener(...) }`를 해 주어야 합니다.
만약 정리해주지 않으면 컴포넌트가 다시 렌더링되거나 사라진 뒤에도 브라우저 메모리에 이벤트 리스너가 중복으로 계속 쌓이는 **메모리 누수(Memory Leak)** 현상이 발생하게 됩니다.

---

## 4. 왜 경고창의 텍스트를 마음대로 바꿀 수 없나요?

과거에는 `e.returnValue = '정말 나가시겠습니까?'`처럼 커스텀 문구를 작성할 수 있었으나, 사용자를 강제로 가두거나 낚시성 메시지를 띄우는 악용 사례가 늘어나면서 **현재 대부분의 모던 브라우저(Chrome, Safari, Firefox 등)는 개발자가 작성한 임의의 텍스트 노출을 금지**하고 있습니다.
따라서 `e.returnValue = ''`로 지정하여 브라우저 자체의 기본 경고 대화상자("변경사항이 저장되지 않을 수 있습니다.")가 뜨도록 설계하는 것이 표준 양식입니다.
