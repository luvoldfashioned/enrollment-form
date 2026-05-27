# 18. 기능 고도화: React Query 캐시를 활용한 강의 요약 배너 추가

## 1. 도입 배경 (Why did we do this?)

사용자는 1단계에서 강의를 고르고 2단계(정보 입력) 화면으로 넘어옵니다.
하지만 정보 입력 폼이 길어지거나 단체 신청 등을 하느라 시간이 지연되면 **"내가 지금 어떤 강의에 신청하고 있던 거지?"** 하고 헷갈릴 수 있습니다.
이를 방지하기 위해 2단계 화면 최상단에 선택된 강의명, 담당 강사, 모집 정원을 알려주는 작은 요약 배너를 삽입했습니다.

이때 성능을 위해 **서버에 데이터를 한 번 더 요청하지 않고, 이미 가져왔던 데이터를 재활용하는 것**이 핵심 기술 포인트입니다.

## 2. 코드 변경 내역 (Before vs After)

### Before: 2단계에서 강의 데이터에 접근할 수단 부재

기존에는 `Step1` 컴포넌트 안에서만 강의 리스트 데이터가 렌더링되고 버려졌습니다.
따라서 `Step2`에서는 부모 컴포넌트의 props로 일일이 넘겨주거나, Redux 같은 전역 상태 관리 라이브러리를 써야 하는 고민이 필요했습니다.

### After: React Query의 Stale-While-Revalidate 캐싱 활용

`@tanstack/react-query`의 `useQuery` 훅을 사용해, 1단계와 완전히 똑같은 `queryKey: ['courses', 'all']`로 데이터를 호출하도록 코드를 추가했습니다.

```tsx
// 1. 현재 폼에 저장된 courseId 감시
const courseId = watch('courseId');

// 2. React Query를 이용해 전역 캐시된 데이터 호출
const { data: coursesData } = useQuery<CourseListResponse>({
  queryKey: ['courses', 'all'],
  queryFn: async () => { ... },
  enabled: !!courseId,
});

// 3. 리스트에서 내가 선택한 단일 강의 추출
const selectedCourse = coursesData?.courses.find((c) => c.id === courseId);
```

이렇게 불러온 `selectedCourse` 데이터를 화면 상단 배너에 그려주었습니다.

---

## 📝 주니어 개발자를 위한 요약 노트

**💡 React Query가 상태 관리(State Management) 라이브러리를 대체하는 원리**
과거에는 API에서 받아온 데이터를 여러 컴포넌트(Step 1, Step 2, Step 3)에서 공유하려면 Redux나 Context API 등 복잡한 '전역 상태 관리 툴'에 무조건 저장해야 했습니다.

하지만 TanStack Query(React Query)를 도입하면, **"같은 `queryKey`를 가진 요청은 일정 시간 동안 서버에 재요청하지 않고 메모리에 캐싱된 기존 데이터를 즉시 반환"**해 줍니다.
즉, `['courses', 'all']` 키 하나만 약속해 두면, 프로젝트 내 어느 컴포넌트에서든 `useQuery`를 선언하기만 해도 **네트워크 비용 없이 전역 상태처럼 공유**할 수 있게 됩니다. 이를 서버 상태(Server State) 관리라고 부르며 최신 프론트엔드 아키텍처의 트렌드입니다.
