import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, ShieldAlert, CheckCircle, Info } from 'lucide-react';
import type { EnrollmentFormInput } from '../../types/form';
import type { CourseListResponse, Course } from '../../mocks/handlers';
import styles from './Step3Confirm.css.module.css';

interface Step3ConfirmProps {
  setStep: (step: number) => void; // 스텝 바로가기용 상태 변경 함수
}

/**
 * 📘 [주니어 개발자 해설]
 * Step3Confirm은 수강 신청의 마지막 '3단계: 요약 정보 확인 및 제출' 화면입니다.
 * 
 * 1. 사용자가 1~2단계에서 작성한 모든 데이터를 일목요연하게 표 형태로 정리해서 보여줍니다.
 * 2. 각 영역(강의 정보, 신청자 인적 사항, 단체 참가자 정보) 우측에 '수정' 링크를 제공하여,
 *    클릭 시 해당 단계로 손쉽게 돌아갈 수 있는 편의 기능을 제공합니다.
 * 3. 필수 검증 필드인 '이용약관 및 개인정보 처리방침 동의' 체크박스를 바인딩하고 유효성 오류 메시지를 제어합니다.
 */
export const Step3Confirm: React.FC<Step3ConfirmProps> = ({ setStep }) => {
  // 1) React Hook Form의 Context로부터 폼 정보 및 유효성 에러를 가져옵니다.
  const {
    register,
    watch,
    formState: { errors }
  } = useFormContext<EnrollmentFormInput>();

  // 2) 요약을 위해 현재 입력된 데이터들을 관찰(Watch)합니다.
  const formData = watch();
  const { courseId, enrollmentType, name, email, phone, motivation, agreedToTerms, group } = formData;

  // 3) 선택된 강의의 자세한 요약 정보를 얻기 위해 강좌 목록을 다시 캐시 리쿼리합니다.
  const { data: coursesData } = useQuery<CourseListResponse>({
    queryKey: ['courses', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/courses');
      return response.json();
    },
    enabled: !!courseId // courseId가 있을 때만 쿼리 작동
  });

  // 선택된 강의 정보 추출
  const selectedCourse = coursesData?.courses.find((c: Course) => c.id === courseId);

  // 금액 포맷터
  const formatPrice = (price?: number) => {
    if (price === undefined) return '';
    return price === 0 ? '무료' : `${price.toLocaleString()}원`;
  };

  // 날짜 포맷터
  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>신청 정보 최종 확인</h2>
      <p className={styles.subtitle}>마지막 단계입니다. 기재된 정보가 올바른지 확인 후 신청서를 제출해 주세요.</p>

      {/* ==========================================
          ① 선택한 강의 정보 요약 박스 (1단계 내용)
          ========================================== */}
      <div className={styles.summaryCard}>
        <div className={styles.cardHeader}>
          <h3>선택한 강의 정보</h3>
          <button 
            type="button" 
            className={styles.editBtn} 
            onClick={() => setStep(1)} // 1단계로 강제 스텝 백
          >
            <Edit2 size={13} />
            <span>수정</span>
          </button>
        </div>
        
        {selectedCourse ? (
          <div className={styles.courseDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>강의명</span>
              <span className={styles.detailValue}>{selectedCourse.title}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>강사</span>
              <span className={styles.detailValue}>{selectedCourse.instructor}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>교육 기간</span>
              <span className={styles.detailValue}>
                {formatDate(selectedCourse.startDate)} ~ {formatDate(selectedCourse.endDate)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>수강료</span>
              <span className={styles.coursePriceVal}>{formatPrice(selectedCourse.price)}</span>
            </div>
          </div>
        ) : (
          <p className={styles.noDataText}>선택된 강의 정보가 존재하지 않습니다.</p>
        )}
      </div>

      {/* ==========================================
          ② 수강생 인적 사항 요약 박스 (2단계 내용)
          ========================================== */}
      <div className={styles.summaryCard}>
        <div className={styles.cardHeader}>
          <h3>신청자 인적 사항</h3>
          <button 
            type="button" 
            className={styles.editBtn} 
            onClick={() => setStep(2)} // 2단계로 강제 스텝 백
          >
            <Edit2 size={13} />
            <span>수정</span>
          </button>
        </div>
        
        <div className={styles.courseDetails}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>신청 구분</span>
            <span className={`${styles.badge} ${enrollmentType === 'group' ? styles.badgeGroup : styles.badgePersonal}`}>
              {enrollmentType === 'group' ? '단체 신청' : '개인 신청'}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>신청자 이름</span>
            <span className={styles.detailValue}>{name}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>이메일</span>
            <span className={styles.detailValue}>{email}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>전화번호</span>
            <span className={styles.detailValue}>{phone}</span>
          </div>
          {motivation && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>수강 동기</span>
              <span className={styles.detailValue}>{motivation}</span>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          ③ 단체 정보 요약 박스 (단체 신청 시에만 노출)
          ========================================== */}
      {enrollmentType === 'group' && group && (
        <div className={styles.summaryCard}>
          <div className={styles.cardHeader}>
            <h3>단체 세부 사항 및 참가 명단</h3>
            <button 
              type="button" 
              className={styles.editBtn} 
              onClick={() => setStep(2)}
            >
              <Edit2 size={13} />
              <span>수정</span>
            </button>
          </div>
          
          <div className={styles.courseDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>단체(회사/학교)명</span>
              <span className={styles.detailValue}>{group.organizationName}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>대표 담당자</span>
              <span className={styles.detailValue}>{group.contactPerson}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>담당자 연락처</span>
              <span className={styles.detailValue}>{group.contactPhone}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>총 신청 인원</span>
              <span className={styles.detailValue}>{group.headCount}명</span>
            </div>

            {/* 동적 참가 명단 리스트 출력 */}
            <div className={styles.participantsListWrapper}>
              <span className={styles.participantListTitle}>참가자 인원 명단</span>
              <table className={styles.participantsTable}>
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>이름</th>
                    <th>이메일 주소</th>
                  </tr>
                </thead>
                <tbody>
                  {group.participants?.map((participant, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{participant.name || <span className={styles.emptyText}>미입력</span>}</td>
                      <td>{participant.email || <span className={styles.emptyText}>미입력</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          ④ 이용약관 동의 체크박스 필드
          ========================================== */}
      <div className={styles.termsSection}>
        <div className={styles.termsWrapper}>
          <label className={styles.checkboxContainer}>
            <input
              type="checkbox"
              className={styles.checkbox}
              {...register('agreedToTerms')}
            />
            <span className={`${styles.customCheckbox} ${agreedToTerms ? styles.checkboxChecked : ''}`}>
              {agreedToTerms && <CheckCircle size={16} className={styles.checkIcon} />}
            </span>
            <span className={styles.checkboxLabel}>
              개인정보 수집 이용 동의 및 수강신청 이용약관에 동의합니다. <span className={styles.required}>*</span>
            </span>
          </label>
        </div>

        {/* 안내사항 박스 */}
        <div className={styles.noticeBox}>
          <Info size={16} />
          <p>
            개인 신청은 제출 즉시 등록이 완료됩니다. 단체 신청의 경우, 서류 검토 후에 승인 대기 상태로 등록되며 대표 메일로 담당자가 개별 안내해 드립니다.
          </p>
        </div>

        <AnimatePresence>
          {errors.agreedToTerms && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={styles.errorMessage}
            >
              <ShieldAlert size={14} />
              <span>{errors.agreedToTerms.message}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
