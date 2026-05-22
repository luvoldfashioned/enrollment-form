import { useCallback } from 'react';
import type { FieldErrors } from 'react-hook-form';
import type { EnrollmentFormInput } from '../types/form';

/**
 * 📘 [주니어 개발자 해설]
 * 폼 검증(Validation) 실패 시, 첫 번째 에러가 발생한 입력 필드로 화면을 부드럽게 스크롤하고
 * 입력 필드에 자동으로 포커스(Auto Focus)를 진입시켜 사용자 경험(UX)을 고도화하는 커스텀 훅입니다.
 * 
 * [도입 배경]
 * 에러 필드로 포커스를 맞추어 이동시키는 복잡한 DOM 조작 로직이 App.tsx에 그대로 들어있어 
 * 비즈니스 로직과 UI 로직이 혼재해 있었습니다. 이 훅을 분리함으로써, 에러 위치를 찾아 
 * 화면을 부드럽게 옮기는 로직의 복잡성을 외부로 격리하였습니다.
 */
export function useFocusOnError(errors: FieldErrors<EnrollmentFormInput>) {
  const focusAndScrollToError = useCallback(() => {
    setTimeout(() => {
      if (!errors) return;

      // 중첩된 에러 객체에서 첫 번째 에러가 발생한 필드 경로 수집
      const getFirstErrorKey = (obj: any, path = ''): string | null => {
        if (!obj) return null;
        if (obj.message) return path;

        for (const key of Object.keys(obj)) {
          // 배열 index(숫자)와 일반 키를 안전하게 name 경로로 병합
          const currentPath = path 
            ? (isNaN(Number(key)) ? `${path}.${key}` : `${path}.${key}`) 
            : key;
          const result = getFirstErrorKey(obj[key], currentPath);
          if (result) return result;
        }
        return null;
      };

      const firstErrorPath = getFirstErrorKey(errors);
      if (!firstErrorPath) return;

      // react-hook-form의 name 매핑 요소 쿼리
      const errorElement = document.querySelector(`[name="${firstErrorPath}"]`) as HTMLElement;

      if (errorElement) {
        errorElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        setTimeout(() => {
          errorElement.focus();
        }, 300); // 스크롤 마친 후 포커스 진입
      }
    }, 0);
  }, [errors]);

  return focusAndScrollToError;
}
