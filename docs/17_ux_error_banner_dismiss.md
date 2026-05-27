# 17. UX 개선: API 에러 배너 해제 및 수동 닫기 기능

## 1. 도입 배경 (Why did we do this?)
사용자가 폼을 최종 제출했을 때 조건에 맞지 않으면(예: 중복 신청, 정원 초과 등) 화면 하단에 붉은색 에러 배너가 나타납니다.
하지만 **에러를 확인하고 폼을 수정하기 위해 이전 단계로 돌아갔을 때도 이 에러 메시지가 계속 남아있어 화면을 가리는 UX(사용자 경험) 저하 문제**가 있었습니다. 

상태(State) 관리를 할 때는 '데이터를 언제 보여줄 것인가'만큼 **'데이터를 언제 초기화(Clear)할 것인가'**가 매우 중요합니다.

## 2. 코드 변경 내역 (Before vs After)

### Before: 상태가 지워지지 않음
이전 코드는 단순히 `step` 상태값을 줄여 이전 단계로 넘어가기만 했습니다. 에러는 다음 번 제출(Submit)이 발생하기 전까지 메모리에 남아있었습니다.

```tsx
// AS-IS: step만 변경하고 submitError는 방치됨
const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));
```

### After: 스텝 이동 시 에러 초기화 및 수동 닫기 버튼 추가
이제 이전 단계로 돌아가는 액션을 취할 때 `submitError` 상태를 명시적으로 `null`로 만들어 배너를 즉시 숨깁니다.
또한, 현재 스텝에 머무르는 동안에도 사용자가 원하면 배너를 닫을 수 있도록 우측 상단에 `X` (Dismiss) 버튼을 추가했습니다.

```tsx
// TO-BE 1: 이전 단계 버튼 클릭 시 에러 상태(submitError) 초기화
const prevStep = () => {
  setSubmitError(null); 
  setStep((prev) => Math.max(prev - 1, 1));
};

// TO-BE 2: X 아이콘을 누르면 에러가 즉시 닫히도록 onClick 이벤트 추가
<button 
  type="button" 
  onClick={() => setSubmitError(null)} 
  style={{ position: 'absolute', right: '12px', top: '12px', ... }}
>
  <X size={16} />
</button>
```

---

## 📝 주니어 개발자를 위한 요약 노트

**💡 UI 상태(State)의 생명주기에 대한 고민**
우리는 종종 데이터를 보여주는 것(Rendering)에 집중한 나머지, **사용자가 기대하는 시점에 데이터를 치워주는 것(Cleaning up)**을 깜빡하곤 합니다. 
이번 패치처럼 사용자의 맥락(Context)이 전환되는 시점(예: 스텝 이동, 모달 닫기, 페이지 라우팅 등)에는 관련된 임시 에러 상태나 로딩 상태를 명시적으로 초기화해주는 습관을 들이면 좋습니다. 

에러 팝업을 '사용자가 스스로 통제할 수 있게(X 버튼)' 만들어 주면 프로덕트의 완성도가 한결 올라갑니다!
