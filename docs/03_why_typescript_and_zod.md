# 📘 주니어 개발자를 위한 코드 해설집 - [03] TypeScript와 Zod 스키마 쉽게 이해하기

이 문서에서는 프로그래밍 입문 단계 혹은 주니어 개발자가 폼을 개발할 때 가장 헷갈려하는 **"유효성 검증(Validation)"**, **"스키마(Schema)"**, **"타입 설계(Type Design)"**, 그리고 **"TypeScript"**의 개념을 눈높이에 맞춰 설명하고 실제 소스 코드를 통해 이를 깊이 있게 해부합니다.

---

## 1. 유효성 검증(Validation)이 뭔가요?
>
> **"사용자가 입력한 데이터가 정말 올바른 형식인지 검사하는 것"**을 말합니다.

* **이메일 입력창**: 중간에 `@` 기호가 들어갔는가? 끝에 `.com`이나 `.net` 같은 도메인 형식이 잘 붙었는가?
* **이름 입력창**: 빈칸으로 두진 않았는가? 최소 2글자 이상은 적었는가?
* **전화번호 입력창**: 문자가 섞이지 않고 숫자만 혹은 `010-XXXX-XXXX` 형태로 들어왔는가?
* **신청 동기**: 너무 길어서 서버 데이터베이스 용량을 초과하지 않는가? (예: 300자 이하)

이렇게 프로그램이 데이터로서 신뢰할 수 있는 값인지를 확인하는 절차를 **유효성 검증(Validation)**이라고 부릅니다.

---

## 2. '스키마(Schema)'와 '타입(Type) 설계'란 무슨 뜻인가요?

이 두 단어는 프론트엔드와 백엔드를 막론하고 정말 자주 쓰이는 용어입니다. 비유를 통해 쉽게 설명해 드릴게요.

### ① 스키마 (Schema)
>
> **"데이터의 규격서"** 혹은 **"데이터 검문소의 규칙 목록"**입니다.

우리가 작성한 Zod 코드를 볼까요?

```typescript
// 실제 src/types/form.ts 의 기본 스키마 정의
export const enrollmentFormSchema = z.object({
  courseId: z.string().min(1, '수강할 강의를 선택해 주세요.'),
  enrollmentType: z.enum(['personal', 'group'], {
    message: '신청 유형을 선택해 주세요.',
  }),
  name: z.string().min(2, '이름은 최소 2글자 이상 입력해 주세요.').max(20, '이름은 최대 20글자 이하여야 합니다.'),
  email: z.string().min(1, '이메일을 입력해 주세요.').email('올바른 이메일 형식이어야 합니다.'),
  phone: z.string().min(1, '연락처를 입력해 주세요.').regex(/^(01[016789]-\d{3,4}-\d{4}|\d{9,11})$/, '올바른 연락처 형식이어야 합니다.'),
  motivation: z.string().max(300, '수강 동기는 최대 300자까지 작성할 수 있습니다.').optional(),
  agreedToTerms: z.boolean().refine(val => val === true, { message: '이용약관 및 개인정보 수집 동의는 필수입니다.' }),
  group: z.object({ ... }).optional(),
});
```

이 덩어리 전체를 **"스키마"**라고 부릅니다. Zod라는 검증 도구를 사용해 데이터 규격을 만들어 둔 것입니다.

### ② 타입 설계 (Type Design)
>
> **"코드 단에서 데이터의 종류(타입)를 명시하여, 실수로 잘못된 데이터를 넣는 것을 방지하는 밑그림"**입니다.

컴퓨터 프로그래밍에서 데이터는 여러 형태(문자열, 숫자, 참/거짓, 배열 등)를 가집니다.
타입 설계를 해두면 컴퓨터가 코드를 읽으며 "어라? 여기 문자열 넣어야 하는데 왜 숫자를 넣었어?"라고 코딩하는 도중에 바로 귓속말을 해줍니다.

---

## 3. TypeScript(타입스크립트)는 왜 쓰는 걸까요?

원래 리액트(React)를 만들 때 쓰는 JavaScript는 매우 자유로운 성격을 가지고 있습니다.

* JavaScript: "변수에 글자를 담았다가, 숫자를 담았다가 마음대로 해~ 난 신경 안 써!"

하지만 이 자유로움 때문에 큰 서비스나 복합적인 폼을 개발할 때 주니어와 시니어 모두 잦은 실수를 범합니다.

* 예: 수강생 인원수를 세야 해서 더하기 연산을 하려는데, 알고 보니 인원수가 문자로 넘어와서 `10 + 1`이 `11`이 아니라 `"101"`이 되는 대참사가 일어납니다.

**TypeScript**는 JavaScript에 **"타입 가드레일(규칙)"**을 추가한 프로그래밍 언어입니다.

### 🌟 TypeScript가 주는 엄청난 혜택

1. **오타 사전 방지**: `user.name`을 실수로 `user.nmae`이라고 적으면, 실행해보기 전에 빨간 줄이 쫙 그어지며 경고해 줍니다.
2. **자동 완성 기능**: `user.`까지만 타이핑해도 사용할 수 있는 속성(`name`, `email`, `phone`) 목록을 편집기가 똑똑하게 추천해 줍니다.
3. **가장 든든한 방어막**: 방금 우리가 실행했던 `npm run build`처럼, 전체 프로그램을 빌드(컴파일)할 때 타입 에러가 단 한 개라도 있으면 배포를 막아줍니다. 오류가 있는 채로 사용자에게 서비스가 제공되는 대형 사고를 원천 차단하는 것이죠!

---

## 4. Zod와 TypeScript의 환상적인 시너지

원래는 **타입(TypeScript)**도 선언해 줘야 하고, 실제 폼에 입력할 때의 **검증 스키마(Zod)**도 따로 만들어야 했습니다.
이렇게 하면 입력 필드 하나를 추가할 때마다 두 군데를 동시에 수정해야 해서 매우 번거롭고 실수하기 쉽습니다.

Zod는 이를 해결하기 위해 **`z.infer` (타입 추론)**라는 엄청난 도구를 제공합니다.

### 📄 실제 코드 분석: 타입 추론

```typescript
// 1. Zod로 데이터의 유효성 검증 규칙(스키마)을 딱 한 번만 짭니다.
export const enrollmentFormSchema = z.object({
  name: z.string().min(2, '이름을 2자 이상 입력하세요.'),
  email: z.string().email('이메일 주소를 입력하세요.'),
});

// 2. 이 스키마를 바탕으로 TypeScript의 '타입'을 알아서 만들어내라고 컴퓨터에 시킵니다.
export type EnrollmentFormData = z.infer<typeof enrollmentFormSchema>;
```

* **`z.infer<typeof 스키마>`**:
  * 이 한 줄을 쓰면, TypeScript가 Zod의 규칙을 해석해서 자동으로 완벽한 Type(타입) 객체를 유추해 냅니다.
  * 추론 결과 생성되는 가상의 TypeScript 타입 형태는 다음과 같습니다.

  ```typescript
  type EnrollmentFormData = {
    courseId: string;
    enrollmentType: 'personal' | 'group';
    name: string;
    email: string;
    phone: string;
    motivation?: string;
    agreedToTerms: boolean;
    group?: {
      organizationName?: string;
      contactPerson?: string;
      contactPhone?: string;
      headCount?: number;
      participants?: Array<{ name: string; email: string }>;
    };
  }
  ```

  이제 개발자는 스키마 하나만 관리하면 되고, TypeScript 타입은 Zod가 실시간으로 알아서 생성해 주기 때문에 중복 코드가 사라지고 관리가 매우 편해집니다.

---

## 💡 요약하자면

* **TypeScript**는 코드를 작성할 때 실수하지 않도록 컴파일 단계에서 지켜주는 **수호천사**입니다.
* **유효성 검증(Validation)**은 사용자가 올바른 값을 써넣었는지 체크하는 **필터**입니다.
* **스키마(Schema)**는 그 필터를 거치기 위해 통과해야 하는 **시험 기준(규격)**입니다.
* **타입 설계**는 우리 코드 안에서 변수들과 데이터가 어떤 안전한 모양새로 돌아다녀야 할지 결정하는 **청사진**입니다.
