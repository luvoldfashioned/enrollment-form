# 로컬스토리지를 활용한 임시 저장 및 복구 가이드 (LocalStorage Auto-Save & Restore Guide)

본 문서는 사용자의 웹 브라우저가 꺼지거나 뜻하지 않게 새로고침을 했을 때도, 작성하던 수강 신청서 데이터를 완전하게 복구하여 이어서 작성하도록 지원하는 **`localStorage` 임시 저장** 기능의 설계와 구현 방식을 주니어 개발자의 관점에서 명쾌하게 설명합니다.

---

## 1. 수강 신청서 임시 저장의 필요성

수강 신청 폼은 1단계(강의 선택), 2단계(개인 정보/단체 참가자 명단 기입), 3단계(약관 동의)에 걸쳐 다양한 정보를 많이 입력해야 합니다.
이러한 다단계 폼에서 네트워크 불안정으로 페이지가 새로고침되거나, 실수로 브라우저 탭을 꺼버렸을 때 처음부터 다시 모든 데이터를 기재해야 한다면 사용자는 심각하게 안 좋은 사용자 경험(UX)을 겪게 됩니다.
이를 방지하고자 입력 도중 실시간으로 데이터를 로컬 브라우저에 저장하고, 다음 접속 시 자동으로 복원해주는 자동 저장(Auto-save) 아키텍처를 적용했습니다.

---

## 2. 핵심 구현 매커니즘

전체 로직은 최상위 `App.tsx`에서 React 훅을 통해 동작합니다.

### ① 실시간 감시(Watch) 및 디바운싱(Debounce) 저장

* React Hook Form의 `watch()` API를 사용해 폼의 전체 상태(`currentFormValues`)를 실시간으로 모니터링합니다.
* 사용자가 키보드로 타이핑을 할 때마다 매번 디스크 쓰기(`localStorage.setItem`)를 수행하면 성능 저하가 발생할 수 있습니다.
* 이를 해결하기 위해 **300ms 디바운스(Debounce)** 타이머를 얹어, 타이핑이 끝나고 0.3초간 멈췄을 때 비로소 로컬스토리지에 저장되도록 효율화했습니다.
* 신청 내용이 없는 빈 상태가 저장되는 비효율을 방지하기 위해 최소한 한 글자라도 들어있을 때만 스토리지가 동작하도록 사전 차단 로직을 구현했습니다.

### ② 최초 마운트 시 복구(Restore)

* 컴포넌트가 처음 화면에 렌더링될 때 딱 한 번 실행되어 보관된 초안이 있는지 확인합니다.
* 무조건 복구하기보다는 사용자에게 명시적으로 물어보는 **`window.confirm` 창**을 노출합니다.
* 사용자가 승인하면 RHF의 `reset(parsedDraft)`을 실행하고, 저장해 두었던 스텝 정보(`savedStep`)도 함께 `setStep`으로 복구해 줍니다.
* 사용자가 원치 않는 구버전 데이터 복구를 거절하면, 스토리지를 깔끔히 청소하여 데이터가 오염되지 않게 조치합니다.

### ③ 데이터 생명주기 관리 (Clean-up)

* 수강 신청 제출 성공 시(`onSubmit` 내부) 혹은 완료 화면에서 새로 작성하기(`handleRestart`)를 할 때는 기존 임시 데이터를 완전히 날려주어야 합니다.
* `localStorage.removeItem`을 사용하여 초안과 스텝 번호를 완벽히 지워줍니다.

---

## 3. 코드 해설

```typescript
// [1] 최초 마운트 시 초안 복구
useEffect(() => {
  if (hasInitiatedDraft.current) return; // 무한 반복 방지 플래그
  hasInitiatedDraft.current = true;

  const savedDraft = localStorage.getItem('enrollment_form_draft');
  const savedStep = localStorage.getItem('enrollment_form_draft_step');

  if (savedDraft) {
    try {
      const parsedDraft = JSON.parse(savedDraft);
      const confirmRestore = window.confirm(
        '이전에 작성하던 임시 수강 신청서가 있습니다.\n데이터를 복구하여 계속 작성하시겠습니까?'
      );

      if (confirmRestore) {
        reset(parsedDraft); // 폼 데이터 복구
        if (savedStep) {
          setStep(Number(savedStep)); // 스텝 상태 복구
        }
      } else {
        // 복구 거절 시 임시 데이터 삭제
        localStorage.removeItem('enrollment_form_draft');
        localStorage.removeItem('enrollment_form_draft_step');
      }
    } catch (error) {
      console.error('임시 저장 데이터 복구 실패:', error);
    }
  }
}, [reset]);

// [2] 폼 데이터 실시간 디바운스 자동 저장
const currentFormValues = watch(); // RHF 전체 값 구독

useEffect(() => {
  if (submitResult) return; // 전송 완료 화면 시 자동 저장 차단

  // 최소 작성 콘텐츠 감지
  const hasAnyContent = 
    currentFormValues.courseId || 
    currentFormValues.name || 
    currentFormValues.email || 
    currentFormValues.phone || 
    currentFormValues.motivation;
    
  if (!hasAnyContent) return;

  // 디바운스 타이머 설정 (300ms)
  const saveTimer = setTimeout(() => {
    localStorage.setItem('enrollment_form_draft', JSON.stringify(currentFormValues));
    localStorage.setItem('enrollment_form_draft_step', String(step));
  }, 300);

  // 이전 타이머 클리어 (Cleanup)
  return () => clearTimeout(saveTimer);
}, [currentFormValues, step, submitResult]);
```

### 💡 디바운스(Debounce)란 무엇인가요?

디바운스는 **짧은 시간 간격으로 연이어 발생하는 이벤트를 그룹화하여 단 한 번만 트리거**되도록 만드는 프로그래밍 기법입니다.
키보드 타이핑 시 한 글자 칠 때마다 `localStorage.setItem`을 실행하게 되면 브라우저 성능에 지장을 주지만, 300ms 디바운싱을 쓰면 타이핑이 멈췄을 때 딱 한 번만 하드디스크에 기록되므로 시스템 성능을 보전할 수 있습니다.
또한 `return () => clearTimeout(saveTimer)` 구문이 매번 다음 타이핑 시점 이전에 이전 예약된 타이머를 취소(Cleanup)해주므로 깔끔하게 마지막 한 번만 작동하게 됩니다.
