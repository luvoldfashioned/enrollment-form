import { useState, useEffect, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { enrollmentFormSchema } from './types/form';
import type { EnrollmentFormData } from './types/form';
import { StepIndicator } from './components/StepIndicator';
import { Step1CourseSelect } from './components/steps/Step1CourseSelect';
import { Step2StudentInfo } from './components/steps/Step2StudentInfo';
import { Step3Confirm } from './components/steps/Step3Confirm';

interface SubmitSuccessResult {
  enrollmentId: string;
  status: 'confirmed' | 'pending';
  enrolledAt: string;
}

/**
 * 📘 [주니어 개발자 해설]
 * 최상위 App 컴포넌트입니다.
 * 
 * 1. 폼의 활성화 단계를 1~3단계로 관리합니다.
 * 2. 1단계(강의 선택), 2단계(정보 입력)에서 다음 단계 버튼을 클릭할 때,
 *    각 단계에 종속된 필드들만 선택하여 `trigger()` 검사를 타이트하게 돌려줍니다.
 * 3. 3단계에서 최종 승인을 누르면 폼 데이터를 백엔드 API 규격에 맞춰 객체를 재구성(Mapping)하여 
 *    `/api/enrollments`로 비동기 POST 전송을 보냅니다.
 * 4. 전송 과정 중 로딩 피드백, API 제출 성공 시 성공 상세화면(신청번호 표시), 실패 시 에러 대화상자 노출을 제공합니다.
 */
function App() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitSuccessResult | null>(null);
  const hasInitiatedDraft = useRef(false);

  // 1) 폼 컨트롤러 및 초기값 선언 (Zod 판별 유니온과 리졸버 타입 정렬을 위해 EnrollmentFormData 바인딩)
  const methods = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentFormSchema),
    mode: 'onChange',
    defaultValues: {
      courseId: '',
      enrollmentType: 'personal',
      name: '',
      email: '',
      phone: '',
      motivation: '',
      agreedToTerms: false
    } as any
  });

  const { trigger, getValues, handleSubmit, reset, watch, formState: { isDirty } } = methods;

  // 유효성 에러 필드로 오토포커스 및 스무스 스크롤링 이동 처리 함수 (높은 숙련도 요구사항)
  const focusAndScrollToError = () => {
    setTimeout(() => {
      const { errors } = methods.formState;
      
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
  };

  // 페이지 이탈 방지 (beforeunload) 처리 (가산점 고도화 1단계)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 폼이 변경되었고(isDirty), 아직 신청 완료 상태가 아닐 때만 이탈 방지 작동
      if (isDirty && !submitResult) {
        e.preventDefault();
        e.returnValue = ''; // 표준 브라우저 이탈 방지 메시지 트리거
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, submitResult]);

  // 1) 최초 진입 시 로컬스토리지에 보관된 초안 확인 및 복구 (가산점 고도화 2단계)
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
  }, [reset]);

  // 폼의 현재 실시간 입력 값 관찰 (Auto-save 대상)
  const currentFormValues = watch();

  // 2) 폼의 상태 변화 감지하여 로컬스토리지에 디바운스 자동 저장 (300ms) (가산점 고도화 2단계)
  useEffect(() => {
    if (submitResult) return;

    // 무의미한 빈 상태 저장 방지
    const hasAnyContent = 
      currentFormValues.courseId || 
      currentFormValues.name || 
      currentFormValues.email || 
      currentFormValues.phone || 
      currentFormValues.motivation;
      
    if (!hasAnyContent) return;

    const saveTimer = setTimeout(() => {
      localStorage.setItem('enrollment_form_draft', JSON.stringify(currentFormValues));
      localStorage.setItem('enrollment_form_draft_step', String(step));
    }, 300);

    return () => clearTimeout(saveTimer);
  }, [currentFormValues, step, submitResult]);

  // 2) 단계별 다음 버튼 클릭 시 유효성 검사 수행
  const handleNextStep = async () => {
    if (step === 1) {
      // 1단계: 강좌와 신청 유형 필수 선택 체크
      const isValid = await trigger(['courseId', 'enrollmentType']);
      if (isValid) {
        setStep(2);
      } else {
        focusAndScrollToError();
      }
    } else if (step === 2) {
      // 2단계: 공통 인적 사항 검사 대상 설정
      const fieldsToValidate: any[] = ['name', 'email', 'phone', 'motivation'];

      // 단체 신청일 경우에는 단체 추가 필드들 및 동적 참가자 명단까지 전부 검사
      const type = getValues('enrollmentType');
      if (type === 'group') {
        fieldsToValidate.push(
          'group.organizationName',
          'group.contactPerson',
          'group.contactPhone',
          'group.headCount'
        );

        const participants = getValues('group.participants') || [];
        participants.forEach((_, idx) => {
          fieldsToValidate.push(
            `group.participants.${idx}.name`,
            `group.participants.${idx}.email`
          );
        });
      }

      const isValid = await trigger(fieldsToValidate);
      if (isValid) {
        setStep(3);
      } else {
        focusAndScrollToError();
      }
    }
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  // 3) 최종 3단계 확인 후 폼 제출 (유니온 타입에 기반하여 런타임과 빌드 무결성 유지)
  const onSubmit = async (data: EnrollmentFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // API 스펙(handlers.ts)에 맞춰 데이터 형태 가공 (applicant 오브젝트 구조 맵핑)
      const apiPayload = {
        courseId: data.courseId,
        type: data.enrollmentType,
        applicant: {
          name: data.name,
          email: data.email,
          phone: data.phone
        },
        motivation: data.motivation,
        agreedToTerms: data.agreedToTerms,
        group: data.enrollmentType === 'group' ? {
          organizationName: data.group.organizationName, // discriminatedUnion으로 인해 '?' 옵셔널 제거 가능!
          contactPerson: data.group.contactPerson,
          contactPhone: data.group.contactPhone,
          headCount: data.group.headCount,
          participants: data.group.participants
        } : undefined
      };

      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });

      const resultData = await response.json();

      if (!response.ok) {
        // 서버에서 전달한 API 에러 메시지가 있을 시 이를 예외 처리로 던짐
        throw new Error(resultData.message || '수강 신청 제출에 실패했습니다.');
      }

      // 신청 성공 상태 기록
      setSubmitResult(resultData);
      localStorage.removeItem('enrollment_form_draft');
      localStorage.removeItem('enrollment_form_draft_step');
    } catch (err: any) {
      setSubmitError(err.message || '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 신청 완료 화면에서 새로 작성하기(초기화) 버튼 처리
  const handleRestart = () => {
    localStorage.removeItem('enrollment_form_draft');
    localStorage.removeItem('enrollment_form_draft_step');
    reset({
      courseId: '',
      enrollmentType: 'personal',
      name: '',
      email: '',
      phone: '',
      motivation: '',
      agreedToTerms: false
    } as any);
    setSubmitResult(null);
    setSubmitError(null);
    setStep(1);
  };

  return (
    <main className="glass-card">
      <h1 className="form-main-title">수강 신청 시스템</h1>
      <p className="subtitle">단계별 폼을 작성해 편리하게 온라인 수강 신청을 마쳐보세요.</p>

      {/* API 성공 완료 화면 렌더링 */}
      {submitResult ? (
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="success-container"
        >
          <div className="success-icon-wrapper">
            <CheckCircle2 size={56} className="success-icon" />
          </div>
          <h2>수강 신청서 접수 완료!</h2>
          <p className="success-desc">
            {submitResult.status === 'confirmed' 
              ? '수강 신청이 정상적으로 즉시 승인(확정)되었습니다.' 
              : '단체 신청 접수가 완료되었습니다. 담당자 승인 후 메일로 안내해 드립니다.'}
          </p>

          <div className="success-details-card">
            <div className="success-row">
              <span className="success-label">접수 신청번호</span>
              <span className="success-value-highlight">{submitResult.enrollmentId}</span>
            </div>
            <div className="success-row">
              <span className="success-label">접수 일시</span>
              <span className="success-value">
                {new Date(submitResult.enrolledAt).toLocaleString()}
              </span>
            </div>
            <div className="success-row">
              <span className="success-label">신청 승인상태</span>
              <span className={`success-badge ${submitResult.status === 'confirmed' ? 'badge-conf' : 'badge-pend'}`}>
                {submitResult.status === 'confirmed' ? '즉시 확정' : '승인 대기 중'}
              </span>
            </div>
          </div>

          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleRestart}
            style={{ width: '100%', marginTop: '1.5rem' }}
          >
            새로운 신청서 작성하기
          </button>
        </motion.div>
      ) : (
        // 신청 폼 입력 본체 화면
        <>
          {/* 스텝 가이드 탑재 */}
          <StepIndicator currentStep={step} totalSteps={3} />

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit, focusAndScrollToError)} noValidate>
              
              <div style={{ minHeight: '320px', marginBottom: '32px' }}>
                {step === 1 && <Step1CourseSelect />}
                {step === 2 && <Step2StudentInfo />}
                {step === 3 && <Step3Confirm setStep={setStep} />}
              </div>

              {/* API 에러 발생 시 경고 상자 노출 */}
              <AnimatePresence>
                {submitError && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="error-banner"
                  >
                    <AlertTriangle size={18} />
                    <span>{submitError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 하단 네비게이션 버튼 바 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={prevStep}
                  disabled={step === 1 || isSubmitting}
                >
                  이전 단계
                </button>

                {step < 3 ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleNextStep}
                  >
                    다음 단계
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                    style={{ 
                      background: 'var(--success)', 
                      boxShadow: '0 4px 14px 0 rgba(34, 197, 94, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={16} className="spin-icon" />
                        <span>신청서 전송 중...</span>
                      </>
                    ) : (
                      <span>신청서 제출</span>
                    )}
                  </button>
                )}
              </div>
              
            </form>
          </FormProvider>
        </>
      )}
    </main>
  );
}

export default App;
