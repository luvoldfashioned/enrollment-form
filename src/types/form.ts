import { z } from 'zod';

// ==========================================
// 1. Zod 유효성 검증 스키마 정의 (z.discriminatedUnion 적용)
// ==========================================

// 개인/단체 공통 기본 스키마
const baseEnrollmentSchema = z.object({
  // [1단계: 강의 선택]
  courseId: z.string().min(1, '수강할 강의를 선택해 주세요.'),
  
  // [2단계: 수강생 공통 기본 정보]
  name: z.string()
    .min(2, '이름은 최소 2글자 이상 입력해 주세요.')
    .max(20, '이름은 최대 20글자 이하여야 합니다.'),
  
  email: z.string()
    .min(1, '이메일을 입력해 주세요.')
    .email('올바른 이메일 형식이어야 합니다. (예: email@example.com)'),
  
  phone: z.string()
    .min(1, '연락처를 입력해 주세요.')
    .regex(
      /^(01[016789]-\d{3,4}-\d{4}|\d{9,11})$/,
      '올바른 연락처 형식이어야 합니다. (예: 010-1234-5678 또는 숫자만 입력)'
    ),
  
  // 수강 동기 (선택 사항, 최대 300자)
  motivation: z.string()
    .max(300, '수강 동기는 최대 300자까지 작성할 수 있습니다.')
    .optional(),

  // [3단계: 약관 동의]
  agreedToTerms: z.boolean().refine(
    (val) => val === true,
    { message: '이용약관 및 개인정보 수집 동의는 필수입니다.' }
  ),
});

// A. 개인 신청 스키마 (enrollmentType = 'personal')
export const personalEnrollmentSchema = baseEnrollmentSchema.extend({
  enrollmentType: z.literal('personal'),
});

// B. 단체 신청 스키마 (enrollmentType = 'group')
export const groupEnrollmentSchema = baseEnrollmentSchema.extend({
  enrollmentType: z.literal('group'),
  group: z.object({
    organizationName: z.string().min(1, '단체명(회사/학교명)은 필수 입력 항목입니다.'),
    contactPerson: z.string().min(1, '대표 연락 담당자 성함은 필수 입력 항목입니다.'),
    contactPhone: z.string()
      .min(1, '담당자 연락처는 필수 입력 항목입니다.')
      .regex(
        /^(01[016789]-\d{3,4}-\d{4}|\d{9,11})$/,
        '올바른 연락처 형식이어야 합니다. (예: 010-1234-5678)'
      ),
    headCount: z.number()
      .min(2, '단체 신청 인원은 최소 2명 이상이어야 합니다.')
      .max(10, '단체 신청 인원은 최대 10명 이하만 가능합니다.'),
    participants: z.array(
      z.object({
        name: z.string().min(1, '참가자 이름을 입력해 주세요.'),
        email: z.string()
          .min(1, '참가자 이메일을 입력해 주세요.')
          .email('올바른 이메일 주소여야 합니다.'),
      })
    ),
  }),
}).superRefine((data, ctx) => {
  // 신청 인원 수와 실제 참가자 리스트의 수량이 일치하는지 추가 횡단 검증
  const headCount = data.group.headCount;
  const participants = data.group.participants || [];
  
  if (participants.length !== headCount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['group', 'participants'],
      message: `신청 인원(${headCount}명)과 입력된 참가자 수(${participants.length}명)가 일치해야 합니다.`,
    });
  }
});

// C. 최종 수강 신청 통합 판별 유니온 스키마
export const enrollmentFormSchema = z.discriminatedUnion('enrollmentType', [
  personalEnrollmentSchema,
  groupEnrollmentSchema,
]);

// ==========================================
// 2. TypeScript 타입 정의 (판별 유니온으로부터 안전하게 추론)
// ==========================================

export type PersonalEnrollment = z.infer<typeof personalEnrollmentSchema>;
export type GroupEnrollment = z.infer<typeof groupEnrollmentSchema>;
export type EnrollmentFormData = PersonalEnrollment | GroupEnrollment;

// 폼 상태 통제 시 컴파일러 에러를 해소하기 위한 느슨한 입력 인터페이스
export interface EnrollmentFormInput {
  courseId: string;
  enrollmentType: 'personal' | 'group';
  name: string;
  email: string;
  phone: string;
  motivation?: string;
  agreedToTerms: boolean;
  group?: {
    organizationName: string;
    contactPerson: string;
    contactPhone: string;
    headCount: number;
    participants: Array<{ name: string; email: string }>;
  };
}
