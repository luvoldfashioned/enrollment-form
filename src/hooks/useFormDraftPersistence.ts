import { useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { EnrollmentFormInput } from '../types/form';

/**
 * 📘 [주니어 개발자 해설]
 * 폼 입력 상태의 로컬스토리지 자동 임시 저장(Auto-save) 및 복구를 전담하는 커스텀 훅입니다.
 * 
 * [리팩토링 도입 배경]
 * 이전에는 App 컴포넌트 본문에서 `const currentFormValues = watch();`를 호출했습니다.
 * 이는 사용자가 글자를 하나씩 입력할 때마다 App 컴포넌트 전체가 매번 리렌더링되는 성능 문제를 유발했습니다.
 * 
 * [개선된 방식]
 * 이 훅에서는 `watch(callback)`의 이벤트 구독(Subscription) 패턴을 활용합니다.
 * 이 방식은 컴포넌트를 리렌더링시키지 않고 백그라운드에서 값의 변화를 감지할 수 있어 성능상 극단적으로 유리합니다.
 * 감지된 변화는 300ms 디바운스 타이머를 거쳐 로컬스토리지에 임시 저장됩니다.
 */
export function useFormDraftPersistence(
  methods: UseFormReturn<EnrollmentFormInput>,
  step: number,
  setStep: (step: number) => void,
  submitResult: any
) {
  const { watch, reset } = methods;
  const hasInitiatedDraft = useRef(false);

  // 1) 컴포넌트 최초 진입 시 로컬스토리지에 보관된 초안 확인 및 복구
  useEffect(() => {
    if (hasInitiatedDraft.current) return;
    hasInitiatedDraft.current = true;

    const savedDraft = localStorage.getItem('enrollment_form_draft');
    const savedStep = localStorage.getItem('enrollment_form_draft_step');

    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        const confirmRestore = window.confirm(
          '이전에 작성하던 임시 수강 신청서가 있습니다.\n데이터를 복구하여 계속 작성하시겠습니까?'
        );

        if (confirmRestore) {
          reset(parsedDraft);
          if (savedStep) {
            setStep(Number(savedStep));
          }
        } else {
          localStorage.removeItem('enrollment_form_draft');
          localStorage.removeItem('enrollment_form_draft_step');
        }
      } catch (error) {
        console.error('임시 저장 데이터 복구 실패:', error);
        localStorage.removeItem('enrollment_form_draft');
        localStorage.removeItem('enrollment_form_draft_step');
      }
    }
  }, [reset, setStep]);

  // 2) 폼의 상태 변화 감지하여 로컬스토리지에 디바운스 자동 저장 (300ms)
  // watch(callback) 구독을 통해 불필요한 전체 리렌더링 없이 상태 감지
  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout>;

    const subscription = watch((value) => {
      if (submitResult) return;

      // 무의미한 빈 상태 저장 방지
      const hasAnyContent =
        value.courseId ||
        value.name ||
        value.email ||
        value.phone ||
        value.motivation;

      if (!hasAnyContent) return;

      if (saveTimer) {
        clearTimeout(saveTimer);
      }

      saveTimer = setTimeout(() => {
        localStorage.setItem('enrollment_form_draft', JSON.stringify(value));
        localStorage.setItem('enrollment_form_draft_step', String(step));
      }, 300);
    });

    return () => {
      subscription.unsubscribe();
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [watch, step, submitResult]);
}
