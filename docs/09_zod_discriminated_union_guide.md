# 📘 주니어 개발자를 위한 코드 해설집 - [09] Zod 판별 유니온(discriminatedUnion) 정밀 분석

본 문서는 **"태스크 3: Zod `z.discriminatedUnion` 리팩토링"**에 대한 해설집입니다.
주니어 개발자도 단번에 이해할 수 있도록 **기존의 느슨한 옵셔널 구조가 왜 문제였는지**, 그리고 **판별 유니온이 왜 도입되었고 어떠한 기술적 우위를 가져오는지** 비유와 실제 코드를 통해 아주 상세히 설명합니다.

*본 문서는 `.gitignore`에 의해 깃 커밋(제출) 시 제외되며, 오직 로컬 학습용으로만 보존됩니다.*

---

## 1. ⚠️ [비포(Before)] 기존 구조: "모든 것을 옵셔널(?)로 열어두던 시절"

이전 코드에서는 하나의 거대한 `z.object` 안에 개인/단체 필드를 모두 몰아넣고, 단체 전용 데이터(`group` 객체)를 단순히 **선택 사항(`optional()`)**으로 처리했습니다.

### 🚫 기존 스키마 구조 (의사 코드)

```typescript
export const enrollmentFormSchema = z.object({
  courseId: z.string(),
  enrollmentType: z.enum(['personal', 'group']),
  name: z.string(),
  // ... 기본 필드들 ...
  
  // ⚠️ 문제의 단체 신청용 추가 상세 정보
  group: z.object({
    organizationName: z.string().optional(),
    contactPerson: z.string().optional(),
    // ... 단체 전용 필드들 전부가 optional() 처리됨 ...
  }).optional(),
});
```

### 🤦‍♂️ 무엇이 문제였을까요?

1. **타입 불안정성 (Type Unsafety)**:
   * TypeScript 컴파일러 입장에서 `EnrollmentFormData` 타입은 그냥 "언제든지 `group`이 있을 수도 있고 없을 수도 있는 객체"일 뿐입니다.
   * 설령 사용자가 화면에서 **단체 신청**을 골랐다 하더라도, 코드상에서 `data.group.organizationName`에 접근하면 컴파일러는 *"어? `group`이 `undefined`일 수도 있는데 왜 바로 접근해? 에러!"*라며 컴파일 에러를 뿜습니다.
   * 결국 컴파일러를 달래기 위해 `data.group?.organizationName` 처럼 **모든 곳에 옵셔널 체이닝(`?`)**을 덕지덕지 써야만 했습니다.
2. **느슨한 런타임 검증**:
   * Zod 스키마 자체적으로 `enrollmentType === 'group'`일 때 단체 필드가 필수라는 것을 강제하지 못하므로, 이를 메우기 위해 스키마 하단에 복잡한 `.superRefine()` 메서드를 추가해 수동으로 검증 이슈(`ctx.addIssue`)를 생성해야 했습니다.
   * 이는 스키마 선언 자체의 직관성을 떨어뜨리는 요인이 되었습니다.

---

## 2. ✨ [애프터(After)] 새로운 구조: "판별 유니온 (Discriminated Union)"

이 문제를 아키텍처 수준에서 깔끔하게 극복하는 방법이 바로 **판별 유니온(Discriminated Union)** 설계 패턴입니다.

### 💡 판별 유니온(Discriminated Union)이란?

"공통된 하나의 속성(판별자, 여기서는 `enrollmentType`)을 기준으로, 전체 객체의 모양을 완전히 서로 다른 구체적인 객체로 분류하는 정적 타입 설계 기법"입니다.

쉽게 말해, 하나의 큰 주머니에 모든 필드를 섞어 놓는 것이 아니라, **"개인 신청 전용 주머니(A)"**와 **"단체 신청 전용 주머니(B)"**를 완전히 따로 만들고, **`enrollmentType` 라벨**을 기준으로 컴퓨터가 두 주머니 중 알맞은 하나를 즉시 꺼내 들게 만드는 방식입니다.

### 🛠️ 실제 리팩토링된 스키마 구조

```typescript
// 1. 공통된 필드만 따로 묶어 베이스로 선언
const baseEnrollmentSchema = z.object({
  courseId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  motivation: z.string().optional(),
  agreedToTerms: z.boolean()
});

// 2. [개인 신청 주머니] : enrollmentType은 오직 'personal' 리터럴만 허용
export const personalEnrollmentSchema = baseEnrollmentSchema.extend({
  enrollmentType: z.literal('personal'),
});

// 3. [단체 신청 주머니] : enrollmentType은 오직 'group' 리터럴만 허용하며, group 객체는 통째로 "필수(required)"
export const groupEnrollmentSchema = baseEnrollmentSchema.extend({
  enrollmentType: z.literal('group'),
  group: z.object({
    organizationName: z.string().min(1, '단체명은 필수입니다.'),
    contactPerson: z.string().min(1, '대표 성함은 필수입니다.'),
    contactPhone: z.string().min(1, '연락처는 필수입니다.'),
    headCount: z.number().min(2).max(10),
    participants: z.array(z.object({ name: z.string(), email: z.string() }))
  })
});

// 4. 두 개의 주머니를 'enrollmentType' 속성을 판별자로 묶어 융합!
export const enrollmentFormSchema = z.discriminatedUnion('enrollmentType', [
  personalEnrollmentSchema,
  groupEnrollmentSchema
]);
```

---

## 3. 🎯 무엇이 좋아졌나요? (왜 도입했는가)

### ① 컴파일 타임의 "타입 좁히기 (Type Narrowing)" 지원

이 부분이 가장 강력한 장점입니다. 조건문 분기를 거치고 나면 TypeScript가 알아서 타입을 구체적으로 추론해 줍니다.

```typescript
const onSubmit = (data: EnrollmentFormData) => {
  // data는 PersonalEnrollment 일 수도 있고, GroupEnrollment 일 수도 있음.

  if (data.enrollmentType === 'group') {
    // 💡 마법이 시작되는 구간!
    // TypeScript는 이 조건문 내부에서 data가 100% GroupEnrollment임을 확신합니다.
    // 따라서 '?' 없이 다이렉트로 아래처럼 적어도 컴파일 에러가 나지 않습니다!
    console.log(data.group.organizationName); 
  } else {
    // 이 조건문 내부에서는 data가 100% PersonalEnrollment입니다.
    // 따라서 data.group에 접근하려 하면 컴파일러가 애초에 group 필드가 없다며 에러를 발생시킵니다!
    // console.log(data.group); ❌ (컴파일 시점에 실수를 차단)
  }
};
```

### ② API 스키마와의 1:1 완벽 정합성

프로젝트 명세서의 API 스펙을 보면 **개인 신청 제출 포맷(`PersonalEnrollmentRequest`)**과 **단체 신청 제출 포맷(`GroupEnrollmentRequest`)**의 객체 형태가 완전히 서로 분리되어 있습니다.
Zod를 판별 유니온으로 설계함으로써, 클라이언트의 입력 폼 타입이 백엔드의 실제 API Payload 규격과 완벽하게 1:1로 정합성을 갖출 수 있게 되어 예기치 못한 데이터 유실이나 400 Validation Error를 원천 차단하게 됩니다.