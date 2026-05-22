import { useEffect } from 'react';

/**
 * 📘 [주니어 개발자 해설]
 * 사용자가 입력 중에 페이지를 새로고침하거나 브라우저 탭을 닫을 때 데이터가 유실되지 않도록
 * 브라우저의 'beforeunload' 이벤트를 바인딩하여 이탈을 경고하는 커스텀 훅입니다.
 * 
 * [도입 배경]
 * 기존에는 App.tsx 본문 내부의 useEffect에서 직접 window event listener를 조작하여
 * App.tsx의 코드가 매우 길어졌습니다. 이 이탈 방지 관심사를 전담 훅으로 분리함으로써
 * 컴포넌트 내부 코드가 훨씬 간결해지고 관심사 분리(SoC)를 만족하게 되었습니다.
 */
export function usePreventLeave(isDirty: boolean, hasSubmitted: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 폼이 변경되었고(isDirty), 아직 신청 완료 상태가 아닐 때만 이탈 방지 작동
      if (isDirty && !hasSubmitted) {
        e.preventDefault();
        e.returnValue = ''; // 표준 브라우저 이탈 방지 메시지 트리거
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, hasSubmitted]);
}
