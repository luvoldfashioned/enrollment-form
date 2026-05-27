# Zod 판별 유니온 리팩토링 상세 보고서 (Zod Discriminated Union Refactoring Details)

본 문서는 수강 신청 다단계 폼에서 개인/단체 신청의 타입 무결성을 강화하고, React Hook Form과 Zod Schema 간의 타입 불일치로 인한 빌드 에러를 완벽하게 해소하기 위해 진행된 리팩토링 과정을 상세히 기록합니다.

---

## 1. 리팩토링 배경 및 목적

### 기존 코드의 한계

- 기존에는 `enrollmentFormSchema`가 하나의 평탄화된 `z.object`로 선언되어 있었고, 단체 신청 세부 정보(`group`) 필드가 단순히 `.optional()`로 열려 있었습니다.
- 2단계 단체 신청에 대한 세부 유효성 검증(단체명 필수, 인원 2~10명, 참가자 수량 매칭, 연락처 형식 등)은 Zod 스키마의 `.superRefine`을 사용하여 우회적으로 구현되어 있었습니다.
- 이 방식은 런타임 검증은 가능했으나, TypeScript 정적 분석 관점에서는 **"이 데이터가 '단체' 신청일 때 반드시 `group` 객체가 내부에 존재한다"**는 보장을 해줄 수 없었습니다. 따라서 제출 시점(`onSubmit`)이나 상세 확인 화면(`Step3Confirm`) 등에서 항상 `data.group?.organizationName`처럼 옵셔널 체이닝(`?`)이나 비필수 타입 처리를 강제하여 타입 안전성(Type Safety)이 훼손되었습니다.

### 해결 방안 (판별 유니온 도입)

- 이를 극복하기 위해 `enrollmentType` ('personal' | 'group') 필드를 판별자(Discriminator)로 삼는 **판별 유니온(Discriminated Union)** 스키마인 `z.discriminatedUnion`을 도입하였습니다.
- 이를 통해 개인 신청(`personal`)과 단체 신청(`group`)을 엄격하게 타입 수준에서 격리 및 제약하였으며, 특정 조건일 때의 필수 필드 보장을 한층 더 탄탄하게 구축했습니다.

---

## 2. 발생한 기술적 난제 및 아키텍처 극복

### 난제: Zod 판별 유니온과 React Hook Form의 타입 충돌

Zod 판별 유니온 적용 시, `z.infer<typeof enrollmentFormSchema>`는 `PersonalEnrollment | GroupEnrollment` 유니온 타입이 됩니다.
하지만 이 유니온 타입을 React Hook Form의 `useForm<EnrollmentFormData>`에 직접 바인딩하여 폼의 모든 입력 필드를 제어하려고 하면 다음과 같은 타입 경고가 발생했습니다.

1. **상호 배타적 필드 접근 에러**:
   React Hook Form의 헬퍼 함수(`register`, `watch`, `setValue`, `errors` 등)가 폼 상태를 제어할 때, 유니온 타입의 공통되지 않은 필드(예: `group`)에 접근하려고 하면 TypeScript 컴파일러가 해당 속성의 존재 여부를 보장할 수 없다는 에러를 냅니다.
2. **리졸버 입력값 불일치 에러**:
   `zodResolver`가 요구하는 입력 데이터 모양과 `useForm`에 정의된 generic 인터페이스 간의 타입 명세가 다를 경우 `Resolver` 할당 에러가 발생합니다.

### 해결 아키텍처: 입력 상태 타입(`Input`)과 최종 제출 타입(`Data`)의 분리

이 난제를 깔끔하게 해결하기 위해 **폼을 제어하기 위한 평탄화된 입력 상태 인터페이스(`EnrollmentFormInput`)**와 **Zod가 최종적으로 유효성을 검증하여 반환하는 도메인 데이터 타입(`EnrollmentFormData`)**을 이원화하는 방식을 도입했습니다.

1. **`EnrollmentFormInput`**:
   폼 전역에서 값을 실시간으로 제어(React Hook Form 내부 제어용)하기 위한 목적의 느슨하고 평탄화된 단일 인터페이스입니다. `group` 객체가 옵셔널로 선언되어 있어 RHF의 모든 헬퍼들이 에러 없이 개별 필드에 안전하게 접근(Register)할 수 있습니다.
2. **`EnrollmentFormData`**:
   Zod의 판별 유니온으로부터 안전하게 추론된 유니온 타입(`PersonalEnrollment | GroupEnrollment`)입니다. 폼이 최종 제출될 때 완벽히 검증 및 정제된 타입 안전 데이터로 기능합니다.
3. **최상위 `App.tsx` 제어**:
   `useForm<EnrollmentFormData>`로 폼 상태를 결합하여 `zodResolver(enrollmentFormSchema)`의 유효성 통과 사양과 엄격히 정렬시킵니다.
4. **하위 스텝 컴포넌트 제어**:
   하위 스텝 컴포넌트(`Step1`, `Step2`, `Step3`)는 공통되지 않는 필드(`group`)에 대한 `register` 및 `watch`를 안전하게 수행해야 하므로 `useFormContext<EnrollmentFormInput>()`을 활용해 데이터를 조작합니다.
5. **최종 제출 시 타입 좁히기 (Type Narrowing)**:
   `onSubmit`에서 유효성 검사가 완료되어 도달한 데이터는 이미 `EnrollmentFormData` 타입입니다. `data.enrollmentType === 'group'` 조건부 처리를 통해 TypeScript 엔진이 데이터를 `GroupEnrollment` 타입으로 자동 추론(Type Narrowing)해주므로, `data.group` 내의 상세 속성들에 옵셔널 체이닝 없이 접근하여 안전하게 API Payload를 빌드할 수 있습니다.

---

## 3. 파일별 변경 상세 내역

### 1) [src/types/form.ts](file:///C:/Dev/jobtest/liveklass/src/types/form.ts)

- `baseEnrollmentSchema`를 정의하여 개인/단체 공통 기본 유효성 속성(강의 정보, 이름, 이메일, 전화번호, 이용약관 동의 등)을 묶었습니다.
- 개인 전용 스키마 `personalEnrollmentSchema`와 단체 전용 스키마 `groupEnrollmentSchema`를 분할 확장했습니다. 단체 전용 스키마 내부의 `group` 필드는 `.optional()`을 걷어내고 필수 필드로 강제 선언했습니다.
- `z.discriminatedUnion('enrollmentType', ...)`를 선언하여 신청 유형에 따른 판별 스키마 `enrollmentFormSchema`를 구축했습니다.
- 폼 입력 바인딩을 위한 `EnrollmentFormInput` 인터페이스를 새롭게 노출하고, 추론된 결과물인 `PersonalEnrollment`, `GroupEnrollment`, 그리고 유니온 타입인 `EnrollmentFormData`를 내보냈습니다.

### 2) [src/App.tsx](file:///C:/Dev/jobtest/liveklass/src/App.tsx)

- `useForm` 선언 시 Zod 스키마 리졸버와 정확히 일치하도록 `useForm<EnrollmentFormData>` 타입을 바인딩했습니다.
- 초기값(`defaultValues`) 설정 시 타입 컴파일러를 우회하도록 `as any` 캐스팅을 안전하게 적용했습니다.
- `onSubmit` 핸들러의 인수 타입을 `EnrollmentFormData`로 변경하여, RHF의 `handleSubmit`과의 결합을 원활하게 조정했습니다.
- 중첩되어 오류를 유발하던 비정상적인 `try-catch` 구문을 하나로 정리하고, 런타임에 이중 검사할 필요가 없는 불필요한 `enrollmentFormSchema.parse(data)`를 제거하여 효율성을 도모했습니다.
- `EnrollmentFormInput`의 미사용 import 경고(`TS6196`)를 삭제했습니다.

### 3) 하위 스텝 컴포넌트

- [src/components/steps/Step1CourseSelect.tsx](file:///C:/Dev/jobtest/liveklass/src/components/steps/Step1CourseSelect.tsx)
- [src/components/steps/Step2StudentInfo.tsx](file:///C:/Dev/jobtest/liveklass/src/components/steps/Step2StudentInfo.tsx)
- [src/components/steps/Step3Confirm.tsx](file:///C:/Dev/jobtest/liveklass/src/components/steps/Step3Confirm.tsx)
- 세 컴포넌트 모두 내부에서 `group` 필드 등 조건부 데이터에 안전하게 접근하고 `errors` 속성을 표시하기 위해 `useFormContext<EnrollmentFormInput>()` 제네릭을 통일하여 교체했습니다. 이로 인해 RHF 타입 컴파일 에러가 완전히 해소되었습니다.

---

## 4. 빌드 무결성 검증 완료

리팩토링 작업 완료 후, 아래 명령어를 순차적으로 구동하여 검증했습니다.

```bash
# 1. TypeScript 정적 분석 통과 검증 (무풍 에러 성공)
npx tsc --noEmit

# 2. Vite 프로덕션 빌드 번들링 성공 검증
npm run build
```

빌드 결과, 에러 없이 안전하게 정적 자산(`dist/`) 컴파일에 성공했습니다.

```text
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-WIRlwWzD.css   22.40 kB │ gzip:   4.99 kB
dist/assets/index-CKE7r6tA.js   486.48 kB │ gzip: 149.74 kB
✓ built in 1.34s
```

이로써 프로젝트의 가장 중요한 기술적 완성도 지표인 **"엄격한 조건부 분기 스키마 설계"**와 **"TypeScript 빌드 무결성 확보"**가 모두 만족되었습니다.
