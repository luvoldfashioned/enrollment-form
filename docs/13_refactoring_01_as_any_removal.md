# 1단계 리팩토링: `as any` 제거 및 타입 통일

이 문서에서는 다단계 수강 신청 폼의 타입 시스템에서 TypeScript 검사를 무력화하던 `as any` 캐스팅을 완전히 제거하고, 코드 전반의 타입을 일관되게 정돈한 작업 내용을 상세하게 분석합니다.

---

## 1. 도입 이유 (왜 변경했는가?)

### A. 기존 코드의 문제점
이전 구현에서는 React Hook Form(이하 RHF)의 제네릭에 Zod 스키마의 추론 타입인 `EnrollmentFormData` (개인/단체 유니온 타입)를 주입했습니다.
- 유니온 타입(`PersonalEnrollment | GroupEnrollment`)을 RHF 제네릭으로 전달하면, RHF 내부의 deep nested key 매핑과 `defaultValues` 매칭 과정에서 컴파일 에러가 발생하게 됩니다.
- RHF가 어떤 상태가 들어올지 정확히 알 수 없어 에러를 뿜자, 이를 회피하기 위해 `defaultValues` 및 `reset()` 호출부에 `as any` 캐스팅을 덧붙여 타입 체커를 강제로 무력화했습니다.
- 이는 런타임에 올바르지 않은 구조의 데이터가 유입되어도 컴파일 타임에 감지할 수 없는 **타입 홀(Type Hole)**을 만들어 냅니다.

### B. 변경 후 해결책
1. **제네릭 통일**: `useForm`에 주입되는 타입을 하위 스텝 컴포넌트와 동일한 **`EnrollmentFormInput` (느슨한 단일 인터페이스)**으로 통일했습니다. 이렇게 하면 폼 내 모든 필드가 에러 없이 유연하게 바인딩되며 `as any` 없이 기본값을 깔끔하게 정의할 수 있습니다.
2. **Resolver 타입 안정성**: Zod resolver가 반환하는 타입(`EnrollmentFormData`)과 폼의 입력 타입(`EnrollmentFormInput`) 간의 불일치는 RHF의 `Resolver` 제네릭을 캐스팅하는 것으로 말끔히 해결했습니다. (`as unknown as Resolver<EnrollmentFormInput>`)
3. **타입 좁히기(Type Narrowing) 복원**: 데이터 제출 시점(`onSubmit`)에서 Zod의 `parse` 메서드를 호출하여 느슨한 `EnrollmentFormInput` 데이터를 완벽한 유니온 스키마(`EnrollmentFormData`)로 재검증하고, 컴파일러에게 명확한 타입을 인지시켰습니다.

---

## 2. 코드 변경 내역 (Before vs After)

### ① `useForm` 제네릭 및 `defaultValues`

#### **[Before]**
```typescript
// 유니온 타입을 그대로 바인딩하여 RHF와 충돌
const methods = useForm<EnrollmentFormData>({
  resolver: zodResolver(enrollmentFormSchema),
  mode: 'onChange',
  defaultValues: {
    courseId: '',
    enrollmentType: 'personal',
    // ...
  } as any // <-- 타입 오류를 감추기 위한 강제 캐스팅
});
```

#### **[After]**
```typescript
// 느슨한 단일 입력 인터페이스로 선언하여 타입 충돌 원천 차단
const methods = useForm<EnrollmentFormInput>({
  // Resolver 타입을 명시적으로 캐스팅하여 두 타입 간 가교 마련
  resolver: zodResolver(enrollmentFormSchema) as unknown as Resolver<EnrollmentFormInput>,
  mode: 'onChange',
  defaultValues: {
    courseId: '',
    enrollmentType: 'personal',
    name: '',
    email: '',
    phone: '',
    motivation: '',
    agreedToTerms: false
  } // <-- as any 제거!
});
```

---

### ② `handleNextStep` 유효성 검사 필드 지정

#### **[Before]**
```typescript
// any 배열을 사용하여 타입 안전성 상실
const fieldsToValidate: any[] = ['name', 'email', 'phone', 'motivation'];
```

#### **[After]**
```typescript
// RHF의 Path 제네릭 타입을 통해 존재하는 유효한 필드 경로만 넘기도록 제한
const fieldsToValidate: Path<EnrollmentFormInput>[] = ['name', 'email', 'phone', 'motivation'];
```

---

### ③ `onSubmit` 내부 데이터 가공

#### **[Before]**
```typescript
const onSubmit = async (data: EnrollmentFormData) => {
  // data가 이미 유니온 타입이라고 가정하고 곧바로 매핑 시도
  const apiPayload = {
    courseId: data.courseId,
    type: data.enrollmentType,
    // ...
  };
};
```

#### **[After]**
```typescript
const onSubmit = async (data: EnrollmentFormInput) => {
  try {
    // 1단계: Zod 스키마를 사용하여 데이터 형태를 안전하게 좁히고 타입 검증(런타임 무결성 보장)
    const validatedData = enrollmentFormSchema.parse(data);

    // 이제 validatedData는 discriminatedUnion이 완벽히 해결된 EnrollmentFormData 타입입니다.
    const apiPayload = {
      courseId: validatedData.courseId,
      type: validatedData.enrollmentType,
      applicant: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone
      },
      motivation: validatedData.motivation,
      agreedToTerms: validatedData.agreedToTerms,
      group: validatedData.enrollmentType === 'group' ? {
        organizationName: validatedData.group.organizationName, // validatedData 타입 덕분에 빨간줄 없이 바인딩 가능!
        contactPerson: validatedData.group.contactPerson,
        contactPhone: validatedData.group.contactPhone,
        headCount: validatedData.group.headCount,
        participants: validatedData.group.participants
      } : undefined
    };
    // ...
  }
};
```

---

## 3. 주니어 개발자를 위한 요약 노트
- **`any`는 타입 검사망을 찢는 치트키**이므로, 실무/과제 전형에서는 가급적 사용을 피해야 합니다.
- **RHF는 느슨하게 입력값을 받아들이고(`FormInput`), 백엔드 제출이나 비즈니스 로직 직전 Zod 검증을 통해 좁혀진 타입(`FormData`)으로 승격시키는 분리 전략**이 최선입니다.
- 이를 통해 컴파일 에러도 없고, 런타임 버그도 없는 강력한 다단계 폼 구조를 완성할 수 있습니다.
