import { http, HttpResponse } from 'msw';

// API 응답 스키마 정의
export interface Course {
  id: string;
  title: string;
  description: string;
  category: 'development' | 'design' | 'marketing' | 'business';
  price: number;
  maxCapacity: number;
  currentEnrollment: number;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
  instructor: string;
}

export interface CourseListResponse {
  courses: Course[];
  categories: string[];
}

export interface EnrollmentResponse {
  enrollmentId: string;
  status: 'confirmed' | 'pending';
  enrolledAt: string;
}

export interface ErrorResponse {
  code: 'COURSE_FULL' | 'DUPLICATE_ENROLLMENT' | 'INVALID_INPUT' | 'SERVER_ERROR';
  message: string;
  details?: Record<string, string>;
}

// mock 강의 데이터
const mockCourses: Course[] = [
  // Development 카테고리
  {
    id: 'course-dev-01',
    title: 'React 19 & Next.js 실무 프로덕션 과정',
    description: 'React 최신 스펙부터 Next.js App Router 아키텍처 및 캐싱 최적화까지 완벽하게 학습합니다.',
    category: 'development',
    price: 350000,
    maxCapacity: 30,
    currentEnrollment: 18,
    startDate: '2026-06-01T09:00:00Z',
    endDate: '2026-07-15T18:00:00Z',
    instructor: '염승빈 엔지니어',
  },
  {
    id: 'course-dev-02',
    title: 'TypeScript 고급 타입 시스템 마스터리',
    description: '컴파일러가 사랑하는 코드를 짜기 위한 강력하고 정교한 고급 타입 정의 기법을 배웁니다.',
    category: 'development',
    price: 280000,
    maxCapacity: 15,
    currentEnrollment: 15, // 정원 초과 (COURSE_FULL 테스트용)
    startDate: '2026-06-05T13:00:00Z',
    endDate: '2026-06-30T17:00:00Z',
    instructor: '김타입 아키텍트',
  },

  // Design 카테고리
  {
    id: 'course-design-01',
    title: 'Figma 디자인 시스템 구축과 인터랙티브 프로토타입',
    description: '디자인 컴포넌트 라이브러리 설계부터 피그마 변수(Variables)를 활용한 고급 프로토타이핑을 구현합니다.',
    category: 'design',
    price: 290000,
    maxCapacity: 20,
    currentEnrollment: 8,
    startDate: '2026-06-10T10:00:00Z',
    endDate: '2026-07-10T12:00:00Z',
    instructor: '이피그 디자이너',
  },
  {
    id: 'course-design-02',
    title: '사용자 중심의 UI/UX 리서치와 휴리스틱 분석',
    description: '서비스의 페인포인트를 데이터로 진단하고, 휴리스틱 원칙을 기반으로 한 개선 전략을 수립합니다.',
    category: 'design',
    price: 240000,
    maxCapacity: 10,
    currentEnrollment: 10, // 정원 초과 (COURSE_FULL 테스트용)
    startDate: '2026-06-08T19:00:00Z',
    endDate: '2026-07-03T21:00:00Z',
    instructor: '박UX 리서처',
  },

  // Marketing 카테고리
  {
    id: 'course-marketing-01',
    title: '데이터 기반 그로스 해킹 실무 A to Z',
    description: 'AARRR 프레임워크를 기반으로 코호트 분석, LTV 개선 및 SQL 쿼리를 활용한 분석 기법을 학습합니다.',
    category: 'marketing',
    price: 320000,
    maxCapacity: 25,
    currentEnrollment: 12,
    startDate: '2026-06-12T14:00:00Z',
    endDate: '2026-07-20T16:00:00Z',
    instructor: '최성장 디렉터',
  },

  // Business 카테고리
  {
    id: 'course-business-01',
    title: 'IT 프로덕트 매니지먼트와 PRD 작성 실무',
    description: '기획서(PRD) 작성법부터 로드맵 설계, 애자일 협업 프로세스 리딩까지 주도적인 PM의 역할을 배웁니다.',
    category: 'business',
    price: 300000,
    maxCapacity: 20,
    currentEnrollment: 9,
    startDate: '2026-06-15T10:00:00Z',
    endDate: '2026-07-15T12:00:00Z',
    instructor: '정지표 PM',
  },
];

// 중복 가입 에러(DUPLICATE_ENROLLMENT) 테스트를 위해 임시로 등록된 사용자 리스트 (인메모리)
const registeredEmails: Set<string> = new Set([
  'duplicate@liveklass.com', // 이 이메일로 신청을 테스트하면 항상 중복 에러가 뜸
]);

export const handlers = [
  // 1. 강의 목록 조회 API
  http.get('/api/courses', ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');

    let courses = mockCourses;
    if (category) {
      courses = mockCourses.filter((course) => course.category === category);
    }

    const categories = ['development', 'design', 'marketing', 'business'];

    const responseData: CourseListResponse = {
      courses,
      categories,
    };

    return HttpResponse.json(responseData, { status: 200 });
  }),

  // 2. 수강 신청 제출 API
  http.post('/api/enrollments', async ({ request }) => {
    try {
      const body = (await request.json()) as any;
      const details: Record<string, string> = {};

      // [기본 검증] 필수 필드 유효성 체크
      if (!body.courseId) details.courseId = '강의 ID는 필수입니다.';
      if (!body.type || (body.type !== 'personal' && body.type !== 'group')) {
        details.type = '신청 유형은 personal 또는 group이어야 합니다.';
      }

      // 신청자(applicant) 정보 검증
      if (!body.applicant) {
        details.applicant = '신청자 정보가 누락되었습니다.';
      } else {
        if (!body.applicant.name?.trim()) details['applicant.name'] = '이름은 필수 입력 항목입니다.';
        if (!body.applicant.email?.trim()) {
          details['applicant.email'] = '이메일은 필수 입력 항목입니다.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.applicant.email)) {
          details['applicant.email'] = '올바른 이메일 형식이 아닙니다.';
        }
        if (!body.applicant.phone?.trim()) {
          details['applicant.phone'] = '연락처는 필수 입력 항목입니다.';
        } else if (!/^\d{2,3}-\d{3,4}-\d{4}$/.test(body.applicant.phone) && !/^\d{9,11}$/.test(body.applicant.phone)) {
          details['applicant.phone'] = '올바른 연락처 형식이 아닙니다. (예: 010-1234-5678 또는 숫자만 입력)';
        }
      }

      // 약관 동의 검증
      if (body.agreedToTerms !== true) {
        details.agreedToTerms = '이용약관 및 개인정보 처리방침에 동의해 주세요.';
      }

      // [단체 신청인 경우 추가 검증]
      if (body.type === 'group') {
        if (!body.group) {
          details.group = '단체 신청 상세 정보가 누락되었습니다.';
        } else {
          if (!body.group.organizationName?.trim()) {
            details['group.organizationName'] = '단체(회사/학교)명은 필수 입력 항목입니다.';
          }
          if (!body.group.contactPerson?.trim()) {
            details['group.contactPerson'] = '대표 연락 담당자 이름은 필수 항목입니다.';
          }

          const headCount = Number(body.group.headCount);
          if (isNaN(headCount) || headCount <= 0) {
            details['group.headCount'] = '신청 인원은 1명 이상의 숫자여야 합니다.';
          }

          if (!Array.isArray(body.group.participants) || body.group.participants.length === 0) {
            details['group.participants'] = '참가자 목록을 입력해 주세요.';
          } else {
            // 인원 수와 참가자 수 불일치 시
            if (body.group.participants.length !== headCount) {
              details['group.participants'] = `신청 인원(${headCount}명)과 등록된 참가자 명단(${body.group.participants.length}명)의 수가 일치하지 않습니다.`;
            }
            // 참가자 개별 필드 검증
            body.group.participants.forEach((p: any, idx: number) => {
              if (!p.name?.trim()) {
                details[`group.participants[${idx}].name`] = '참가자 이름이 유효하지 않습니다.';
              }
              if (!p.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
                details[`group.participants[${idx}].email`] = '참가자 이메일 형식이 올바르지 않습니다.';
              }
            });
          }
        }
      }

      // 1) 검증 에러가 있을 시 INVALID_INPUT 반환
      if (Object.keys(details).length > 0) {
        const errorResponse: ErrorResponse = {
          code: 'INVALID_INPUT',
          message: '입력 값 양식이 유효하지 않습니다. 정보를 다시 확인해 주세요.',
          details,
        };
        return HttpResponse.json(errorResponse, { status: 400 });
      }

      // 2) 존재하지 않는 강의 체크
      const selectedCourse = mockCourses.find((course) => course.id === body.courseId);
      if (!selectedCourse) {
        const errorResponse: ErrorResponse = {
          code: 'INVALID_INPUT',
          message: '존재하지 않거나 서비스가 종료된 강의입니다.',
        };
        return HttpResponse.json(errorResponse, { status: 400 });
      }

      // 3) 중복 신청 여부 체크 (DUPLICATE_ENROLLMENT)
      if (registeredEmails.has(body.applicant.email)) {
        const errorResponse: ErrorResponse = {
          code: 'DUPLICATE_ENROLLMENT',
          message: '이미 수강 신청이 완료된 강의입니다. 한 ID당 1회만 신청할 수 있습니다.',
        };
        return HttpResponse.json(errorResponse, { status: 409 });
      }

      // 4) 정원 초과 체크 (COURSE_FULL)
      const requestedSpots = body.type === 'group' ? Number(body.group.headCount) : 1;
      if (selectedCourse.currentEnrollment + requestedSpots > selectedCourse.maxCapacity) {
        const errorResponse: ErrorResponse = {
          code: 'COURSE_FULL',
          message: `정원이 가득 차 수강을 신청할 수 없습니다. (현재 신청자 수: ${selectedCourse.currentEnrollment}/${selectedCourse.maxCapacity}명, 신청 희망 인원: ${requestedSpots}명)`,
        };
        return HttpResponse.json(errorResponse, { status: 409 });
      }

      // 5) 성공 응답 처리 (인메모리 인원 수 가산 및 중복 검증용 이메일 등록)
      selectedCourse.currentEnrollment += requestedSpots;
      registeredEmails.add(body.applicant.email);

      // 서버 처리 중 딜레이 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const isPersonal = body.type === 'personal';
      const responseData: EnrollmentResponse = {
        enrollmentId: `enr-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        status: isPersonal ? 'confirmed' : 'pending', // 개인은 즉시 confirmed, 단체는 승인 대기 pending
        enrolledAt: new Date().toISOString(),
      };

      return HttpResponse.json(responseData, { status: 201 });
    } catch (error) {
      const errorResponse: ErrorResponse = {
        code: 'SERVER_ERROR',
        message: '서버 내부 에러가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      };
      return HttpResponse.json(errorResponse, { status: 500 });
    }
  }),
];
