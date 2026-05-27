# 📘 주니어 개발자를 위한 코드 해설집 - [02] Zod 검증 스키마와 데이터 타입 설계

이 문서는 사용자가 폼에 값을 입력했을 때 그것을 검사하는 **유효성 검증(Validation)** 시스템이 어떻게 설계되었는지 주니어 개발자의 눈높이에서 쉽게 해설합니다.

---

## 1. Zod 스키마가 무엇인가요? (쉽게 이해하는 개념)

쉽게 비유하자면, Zod는 우리가 수강 신청서를 받을 때 통과시켜야 하는 **"필터링 검문소"**와 같습니다.

- "이름 입력창에 글자를 안 적었네? 통과 못 해!"
- "이메일 적는 곳에 골뱅이(@)를 안 넣었네? 뒤로 돌아가!"
이러한 규칙들을 코드 한 줄 한 줄로 우아하게 정의해둔 문서가 바로 `src/types/form.ts`에 들어 있는 스키마(`enrollmentFormSchema`)입니다.

---

## 2. 실제 소스 코드 분석 및 원리 파헤치기

### 📄 [src/types/form.ts] - 폼 데이터 검증의 기초 설계도

#### ① 기본 항목 검증 (간단한 한 줄 규칙)

기본적인 항목은 Zod가 제공하는 한 줄 함수로 간단하게 에러 문구와 범위를 지정할 수 있습니다.

```typescript
// 실제 src/types/form.ts 코드 조각
name: z.string()
  .min(2, '이름은 최소 2글자 이상 입력해 주세요.') // 2자 미만 시 에러 출력
  .max(20, '이름은 최대 20글자 이하여야 합니다.'),
```

- **`z.string()`**: 입력값이 반드시 텍스트 형태여야 함을 정의합니다.
- **`min(2, '이름은 최소...')`**: 사용자가 입력한 문자열의 최소 길이를 검사하여, 2자 미만으로 입력할 시 지정된 에러 메시지를 표시합니다.
- **`max(20, '이름은 최대...')`**: 사용자가 20자를 초과하여 입력하지 못하도록 상한선을 둡니다.

```typescript
// 연락처 정규식 검증 코드 조각
phone: z.string()
  .min(1, '연락처를 입력해 주세요.')
  .regex(
    /^(01[016789]-\d{3,4}-\d{4}|\d{9,11})$/,
    '올바른 연락처 형식이어야 합니다. (예: 010-1234-5678 또는 숫자만 입력)'
  ),
```

- **`regex(정규표현식, '에러메시지')`**: 전화번호 포맷처럼 특정한 모양의 텍스트가 들어왔는지 검사합니다.
  - `01[016789]`: 시작은 010, 011, 016, 017, 018, 019만 허용합니다.
  - `-\d{3,4}-\d{4}`: 중간 대시(-)와 숫자 3~4자리, 그리고 마지막 대시와 숫자 4자리 조합을 검사합니다.
  - `|\d{9,11}`: 대시가 없는 경우에는 전체 숫자 개수가 9자리에서 11자리 사이인 경우만 허용합니다.

#### ② 동적 조건부 검사 (`superRefine` 마법)

이 프로젝트의 가장 핵심적인 비즈니스 룰 중 하나는 **"개인 신청일 때는 단체 정보를 안 적어도 되지만, 단체 신청을 골랐을 때는 단체명과 참가 인원 명단을 무조건 입력해야 한다"**는 것입니다.

이를 해결하기 위해 Zod의 강력한 도구인 **`superRefine`**을 사용했습니다.

```typescript
// 실제 src/types/form.ts의 superRefine 코드 분석
.superRefine((data, ctx) => {
  // 사용자가 라디오 버튼에서 '단체 신청(group)'을 골랐을 때만 이 안의 검사가 실행됩니다!
  if (data.enrollmentType === 'group') {
    const groupData = data.group;

    // 만약 단체 정보 객체가 비어있다면, 에러 바구니(ctx)에 에러를 추가(addIssue)합니다.
    if (!groupData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['group'], // 화면상에 group 전체가 문제라고 가리킵니다.
        message: '단체 신청 세부 정보가 입력되지 않았습니다.',
      });
      return;
    }

    // 1) 단체명이 비어있는지 확인 (공백 제거 후 검사)
    if (!groupData.organizationName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['group', 'organizationName'], // group 객체 안에 organizationName 필드를 콕 집어 에러로 지정합니다.
        message: '단체명(회사/학교명)은 필수 입력 항목입니다.',
      });
    }

    // 2) 대표 담당자 성함 필수 확인
    if (!groupData.contactPerson?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['group', 'contactPerson'],
        message: '대표 연락 담당자 성함은 필수 입력 항목입니다.',
      });
    }

    // 3) 담당자 연락처 필수 및 정규식 확인
    if (!groupData.contactPhone?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['group', 'contactPhone'],
        message: '담당자 연락처는 필수 입력 항목입니다.',
      });
    } else {
      const phoneRegex = /^(01[016789]-\d{3,4}-\d{4}|\d{9,11})$/;
      if (!phoneRegex.test(groupData.contactPhone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['group', 'contactPhone'],
          message: '올바른 연락처 형식이어야 합니다. (예: 010-1234-5678)',
        });
      }
    }

    // 4) 신청 인원 수 제한 및 하단 참가자 명단의 줄 수가 똑같은지 대조
    const headCount = groupData.headCount;
    if (headCount === undefined || isNaN(headCount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['group', 'headCount'],
        message: '신청 인원은 필수 입력 항목입니다.',
      });
    } else if (headCount < 2 || headCount > 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['group', 'headCount'],
        message: '단체 신청 인원은 최소 2명, 최대 10명까지만 가능합니다.',
      });
    } else {
      const participants = groupData.participants || [];
      if (participants.length !== headCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['group', 'participants'],
          message: `신청 인원(${headCount}명)과 입력된 참가자 수(${participants.length}명)가 일치해야 합니다.`,
        });
      }
    }
  }
})
```

- **`superRefine`**: 모든 필드를 일단 다 훑어본 다음에, 전체 데이터를 교차 검증할 수 있게 해주는 Zod의 끝판왕 함수입니다.
- **`ctx.addIssue`**: 검사 중에 잘못된 것을 찾아내면 에러 메시지(Issue)를 생성해 브라우저 폼 화면에 해당 에러가 나도록 뿌려주는 함수입니다. `path` 옵션을 통해 어떤 입력 창에 빨간 줄을 띄울지 정확한 주소를 지정합니다.
  - 예: `path: ['group', 'organizationName']`은 HTML 폼의 `name="group.organizationName"` 인풋 요소 밑에 에러 메시지를 노출하게 만들어 줍니다.

#### ③ Zod로 TypeScript 타입 자동 생성하기 (`z.infer`)

원래는 데이터 구조를 Zod 스키마로도 짜고, TypeScript의 `interface`로도 손수 또 짜야 해서 코드가 중복되는 경우가 많았습니다.
하지만 Zod는 스키마를 한 번 정의해 놓으면 그 스케치북을 기반으로 타입을 자동 추론(Infer)해 줍니다.

```typescript
export type EnrollmentFormData = z.infer<typeof enrollmentFormSchema>;
```

- **`z.infer`**: 이 한 줄을 쓰면, TypeScript가 Zod의 규칙을 해석해서 자동으로 완벽한 Type(타입) 객체를 유추해 냅니다. 앞으로 이 `EnrollmentFormData` 타입을 코드 전반에서 사용하여 안전하게 코딩할 것입니다.

---

## 3. 이 설계를 리액트 폼에서 어떻게 쓰게 되나요?

다음 단계인 컴포넌트 개발 단계에서, **React Hook Form**의 `trigger` 기능을 사용하게 됩니다.

```typescript
// 실제 src/App.tsx에 작성된 스텝 2 이동 시 유효성 검사 로직
const fieldsToValidate: any[] = ['name', 'email', 'phone', 'motivation'];
const type = getValues('enrollmentType');
if (type === 'group') {
  fieldsToValidate.push(
    'group.organizationName',
    'group.contactPerson',
    'group.contactPhone',
    'group.headCount'
  );
  const participants = getValues('group.participants') || [];
  participants.forEach((_, idx) => {
    fieldsToValidate.push(
      `group.participants.${idx}.name`,
      `group.participants.${idx}.email`
    );
  });
}

const isStep2Valid = await trigger(fieldsToValidate);
if (isStep2Valid) {
  setStep(3); // 에러가 없을 때만 3단계 화면으로 넘깁니다!
}
```

이런 식으로 전체 폼은 하나로 관리하되, 단계별로 필요한 필드만 검사하여 진행하게 함으로써 **"스텝 간 데이터 보존"**과 **"단계별 완벽 검증"** 두 토끼를 다 잡게 됩니다.

---

## 💡 주니어 실무 팁: `z.enum` 사용 시 TS 컴파일 에러 예방하기

Zod v3에서 `z.enum`에 커스텀 에러 메시지를 제공하려고 할 때, 흔히 아래와 같은 에러를 마주할 수 있습니다.

```bash
error TS2769: No overload matches this call.
Object literal may only specify known properties, and 'errorMap' (or 'required_error') does not exist in type ...
```

이는 `z.enum`의 인자 형식과 타입 오버로드 매칭 과정에서 `errorMap` 옵션이 특정 라이브러리 버전/환경에서 충돌하여 발생하는 문제입니다.

이를 해결하기 위해, 에러 객체에 `errorMap` 대신 직관적인 **`message`** 속성을 바로 사용하도록 아래와 같이 변경하여 빌드 문제를 해결했습니다.

```typescript
// AS-IS (에러 발생)
enrollmentType: z.enum(['personal', 'group'], {
  errorMap: () => ({ message: '신청 유형을 선택해 주세요.' }),
})

// TO-BE (정상 컴파일 및 동작)
enrollmentType: z.enum(['personal', 'group'], {
  message: '신청 유형을 선택해 주세요.',
})
```

이처럼 타입 시스템의 매칭 세부 사항에 맞춰 유연하게 옵션을 조율함으로써 빌드 안정성을 확보할 수 있습니다.
