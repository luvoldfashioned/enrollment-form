import { z } from 'zod';

// ==========================================
// 1. Zod 유효성 검증 스키마 정의 (3단계용)
// ==========================================

export const enrollmentFormSchema = z.object({
  // [1단계: 강의 및 신청 유형 선택]
  courseId: z.string().min(1, '수강할 강의를 선택해 주세요.'),
  
  enrollmentType: z.enum(['personal', 'group'], {
    message: '신청 유형을 선택해 주세요.',
  }),

  // [2단계: 수강생 기본 정보]
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
  
  // 수강 동기 (요구사항: 최대 300자)
  motivation: z.string()
    .max(300, '수강 동기는 최대 300자까지 작성할 수 있습니다.')
    .optional(),

  // [3단계: 약관 동의]
  agreedToTerms: z.boolean().refine(
    (val) => val === true,
    { message: '이용약관 및 개인정보 수집 동의는 필수입니다.' }
  ),

  // 단체 신청용 추가 상세 정보 (1단계에서 'group' 선택 시 2단계에서 입력받음)
  group: z.object({
    organizationName: z.string().optional(),
    contactPerson: z.string().optional(),
    contactPhone: z.string().optional(),
    headCount: z.number().optional(),
    participants: z.array(
      z.object({
        name: z.string().min(1, '참가자 이름을 입력해 주세요.'),
        email: z.string()
          .min(1, '참가자 이메일을 입력해 주세요.')
          .email('올바른 이메일 주소여야 합니다.'),
      })
    ).optional(),
  }).optional(),
})
// superRefine을 통해 2단계에서 단체 신청(group)에 대한 강력한 비즈니스 조건부 검증 수행
.superRefine((data, ctx) => {
  if (data.enrollmentType === 'group') {
    const groupData = data.group;

    if (!groupData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['group'],
        message: '단체 신청 세부 정보가 입력되지 않았습니다.',
      });
      return;
    }

    // 1) 단체명(회사/학교명) 필수 검증
    if (!groupData.organizationName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['group', 'organizationName'],
        message: '단체명(회사/학교명)은 필수 입력 항목입니다.',
      });
    }

    // 2) 대표 담당자 이름 필수 검증
    if (!groupData.contactPerson?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['group', 'contactPerson'],
        message: '대표 연락 담당자 성함은 필수 입력 항목입니다.',
      });
    }

    // 3) 담당자 연락처 필수 및 연락처 포맷 검증 (추가 요구사항)
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

    // 4) 신청 인원 검증 (요구사항: 2~10명)
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
      // 5) 참가자 명단 매칭 및 개별 명단 입력 검사
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
});

// ==========================================
// 2. TypeScript 타입 정의 (Zod 스키마로부터 추론)
// ==========================================

export type EnrollmentFormData = z.infer<typeof enrollmentFormSchema>;
