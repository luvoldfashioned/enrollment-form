# 📘 주니어 개발자를 위한 코드 해설집 - [01] 프로젝트 초기 설정 및 MSW API 모킹

이 문서는 프로젝트가 어떻게 설정되었고, 작성된 코드들이 어떤 역할을 하며 서로 어떻게 맞물려 돌아가는지 **주니어 개발자의 눈높이**에서 한 줄 한 줄 친절하게 설명하기 위해 작성되었습니다.

---

## 1. 우리가 사용하는 기술 스택은 무엇인가요? (쉽게 이해하는 도구 목록)

우리가 개발에 들어가기 전에 설치한 패키지들이 왜 필요하고 어떤 역할을 하는지 핵심 개념만 비유로 설명해 드릴게요.

* **Vite (바이트)**: 웹사이트를 빌드하고 실행해 주는 아주 빠른 엔진입니다. 예전 방식(Webpack)보다 로딩 속도가 10배 이상 빨라서, 코드를 고치자마자 0.1초 만에 화면에 반영해 줍니다.
* **React Query (리액트 쿼리)**: 인터넷에서 데이터를 받아올 때, "지금 데이터를 불러오는 중(Loading)...", "불러오다 에러가 났음(Error)...", "성공적으로 데이터를 가져왔음(Success)..." 같은 상태를 자동으로 감지해서 관리해 주는 해결사입니다.
* **React Hook Form (리액트 훅 폼)**: 이름, 이메일, 전화번호 등을 입력하는 창(Form)을 다룰 때 성능이 버벅거리지 않게 도와줍니다. 글자 하나 입력할 때마다 화면 전체가 덜덜 떨리며 다시 그려지는 현상(불필요한 렌더링)을 방지합니다.
* **Zod (조드)**: "이메일은 반드시 골뱅이(@)가 들어가야 해", "전화번호는 숫자와 하이픈(-)만 들어가야 해" 같이 **입력값의 규칙을 정해두는 명세서**입니다. React Hook Form과 엮어서 잘못 입력하면 경고 메시지를 뿜게 만듭니다.
* **MSW (Mock Service Worker / 목 서비스 워커)**: **가짜 백엔드 서버** 역할을 하는 마법 같은 라이브러리입니다. 백엔드 개발자가 API 서버를 만들어주지 않았더라도, 브라우저가 `/api/courses` 같은 주소로 요청을 보낼 때 중간에 가로채서(Intercept) 우리가 작성해둔 모의 데이터를 대신 넘겨줍니다. 개발자 도구의 Network 탭에서도 실제 통신이 일어나는 것처럼 보여서 테스트하기 최적입니다.

---

## 2. 코드 한 줄씩 뜯어보기 및 실무 소스 분석

우리가 방금 수정한 파일들이 실제로 어떻게 돌아가는지 실제 작성된 리얼 코드를 한 줄씩 뜯어가며 원리를 파헤쳐 보겠습니다.

### 📄 [src/main.tsx] - 전체 애플리케이션의 입구

이 파일은 우리 웹사이트가 시작되는 가장 첫 관문입니다. 여기서 **React Query**와 **MSW(가짜 서버)**를 연결했습니다.

```typescript
// 실제 src/main.tsx 소스 코드 분석
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

// 1. React Query를 활성화하기 위한 인스턴스를 만듭니다.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // 다른 탭에 갔다 왔을 때 데이터를 알아서 다시 불러오지 않도록 끕니다.
      retry: false,                // API 요청이 실패했을 때 백그라운드에서 다시 재시도하지 않도록 끕니다 (에러 즉시 확인용).
    },
  },
});

// 2. 가짜 서버(MSW)를 시작하는 함수입니다.
async function enableMocking() {
  // 개발 모드(Local 환경)가 아니라 실제 배포된 서버라면 가짜 서버를 켜지 않고 종료합니다.
  if (!import.meta.env.DEV) {
    return;
  }

  // 브라우저에서 동작하는 가짜 서버 설정 파일(browser.ts)을 동적으로 불러옵니다.
  const { worker } = await import('./mocks/browser');

  // 가짜 서버를 실행합니다! 
  // onUnhandledRequest: 'bypass' 설정은 이미지 파일(.svg 등)이나 모킹하지 않은 일반 리소스는 가로채지 않고 그냥 통과시키겠다는 뜻입니다.
  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

// 3. 아주 중요한 흐름입니다!
// enableMocking() 함수가 완료(then)된 후에 비로소 리액트 앱을 마운트(렌더링)합니다.
enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {/* QueryClientProvider로 감싸주어 하위 모든 컴포넌트에서 React Query의 API 상태 관리를 쓸 수 있게 합니다. */}
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>
  );
});
```

* **`enableMocking().then(...)` 비동기 흐름 제어**:
  * 만약 MSW 워커 시작(`worker.start()`)의 완료 프로미스를 기다리지 않고 리액트를 즉시 화면에 렌더링하면, 리액트 마운트 초기에 발동되는 컴포넌트 데이터 페칭(`GET /api/courses`)이 **MSW 가로채기 엔진 작동 시점보다 빠르게 발송되어 브라우저 네트워크 404 에러를 뿜는 참사**가 납니다. 반드시 가로채기 준비가 다 끝난 프로미스 반환 후에 `.then()`에서 렌더링을 켜야 합니다.

---

### 📄 [src/mocks/handlers.ts] - 가짜 서버가 응답하는 규칙서

여기는 브라우저가 특정 주소로 데이터를 달라고 할 때 어떤 데이터를 던져줄지 가짜 서버의 규칙을 정하는 곳입니다.

#### ① 강의 목록 조회 (`GET /api/courses`)

사용자가 강의 목록 화면에 들어왔을 때, 어떤 카테고리의 강의들이 정원 몇 명으로 개설되어 있는지 응답하는 역할을 합니다.

```typescript
// 실제 src/mocks/handlers.ts 의 강의 조회 부분 코드 분석
http.get('/api/courses', ({ request }) => {
  // 사용자가 주소창에 친 주소 정보(예: /api/courses?category=development)를 읽어옵니다.
  const url = new URL(request.url);
  const category = url.searchParams.get('category'); // 'development' 같은 값을 꺼냅니다.

  let courses = mockCourses;
  // 만약 특정 카테고리를 골라서 조회했다면, 그 카테고리에 맞는 강의만 남기고 필터링합니다.
  if (category) {
    courses = mockCourses.filter((course) => course.category === category);
  }

  const categories = ['development', 'design', 'marketing', 'business'];

  // 최종적으로 가짜 데이터와 상태코드 200(성공)을 브라우저에 반환합니다.
  return HttpResponse.json({ courses, categories }, { status: 200 });
})
```

* **`new URL(request.url)`**: 브라우저 표준 명세에 부합하도록 요청 URL에서 파라미터를 읽습니다.
* **`mockCourses.filter(...)`**: 전달받은 `category` 조건으로 Mock 배열을 필터링하여 프론트엔드에 응답을 내려보냅니다.

#### ② 수강 신청 제출 (`POST /api/enrollments`)

사용자가 폼을 다 채우고 "제출"을 눌렀을 때, 입력한 값들을 검사하고 성공 혹은 실패 처리를 시뮬레이션해 줍니다.

```typescript
// 실제 src/mocks/handlers.ts 의 신청서 제출 부분 코드 분석
http.post('/api/enrollments', async ({ request }) => {
  try {
    const body = (await request.json()) as any; // 사용자가 폼에 입력해서 보낸 원본 데이터를 읽습니다.
    const details: Record<string, string> = {}; // 에러가 난 항목들을 저장할 바구니입니다.

    // 1) 기본 검사: 필수 입력값이 비어있거나 형식이 다르면 바구니에 에러 메시지를 담습니다.
    if (!body.courseId) details.courseId = '강의 ID는 필수입니다.';
    if (!body.applicant.name?.trim()) details['applicant.name'] = '이름은 필수입니다.';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!body.applicant.email || !emailRegex.test(body.applicant.email)) {
      details['applicant.email'] = '올바른 이메일 형식이 아닙니다.';
    }
    
    // 2) 바구니(details)에 에러가 하나라도 들어있다면 'INVALID_INPUT' (400 에러)를 응답합니다.
    if (Object.keys(details).length > 0) {
      return HttpResponse.json({
        code: 'INVALID_INPUT',
        message: '입력 값 양식이 유효하지 않습니다.',
        details, // 화면에 어느 필드가 에러났는지 콕 집어 표시하기 위해 돌려줍니다.
      }, { status: 400 });
    }

    // 3) 이메일이 'duplicate@liveklass.com' 인 경우, 일부러 중복 신청 에러(DUPLICATE_ENROLLMENT)를 뿜게 만듭니다.
    if (body.applicant.email === 'duplicate@liveklass.com') {
      return HttpResponse.json({
        code: 'DUPLICATE_ENROLLMENT',
        message: '이미 수강 신청이 완료된 강의입니다.',
      }, { status: 409 });
    }

    // 4) 정원이 꽉 찬 강의를 신청했는지 검사합니다.
    const selectedCourse = mockCourses.find(c => c.id === body.courseId);
    if (selectedCourse.currentEnrollment >= selectedCourse.maxCapacity) {
      return HttpResponse.json({
        code: 'COURSE_FULL',
        message: '정원이 가득 차 수강을 신청할 수 없습니다.',
      }, { status: 409 });
    }

    // 5) 모든 조건이 완벽하다면 1.5초를 기다린 뒤(서버 로딩 연출) 성공 응답을 보냅니다.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return HttpResponse.json({
      enrollmentId: `enr-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      status: body.type === 'personal' ? 'confirmed' : 'pending',
      enrolledAt: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    return HttpResponse.json({ code: 'SERVER_ERROR', message: '서버 내부 에러 발생' }, { status: 500 });
  }
})
```

* **지연 시뮬레이션 (`setTimeout`)**:
  * 백그라운드 서버 통신의 현실적 대기 1.5초를 임의로 지연시킴으로써, 사용자가 더블 클릭(중복 전송)을 연속으로 했을 때 이를 클라이언트 단에서 방지하는 로딩 비활성화 UI가 올바르게 작동하는지 수월하게 목격하고 테스트하도록 유도합니다.
* **409 Conflict 분기**:
  * 중복 메일 시뮬레이션을 구현하여, API 에러에 대응하여 화면 상단에 경고 배너가 잘 출력되는지 프론트엔드가 테스트할 수 있는 장치입니다.
