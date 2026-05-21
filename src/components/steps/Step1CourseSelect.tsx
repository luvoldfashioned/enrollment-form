import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, User, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import type { EnrollmentFormData } from '../../types/form';
import type { Course, CourseListResponse } from '../../mocks/handlers';
import styles from './Step1CourseSelect.css.module.css'; // CSS 모듈 사용

/**
 * 📘 [주니어 개발자 해설]
 * Step1CourseSelect는 3단계 구성 중 '1단계: 강의 및 신청 유형 선택'을 담당합니다.
 * 
 * 1. TanStack Query (`useQuery`)를 사용해서 MSW 모킹 서버로부터 강좌 데이터를 비동기 조회합니다.
 * 2. 카테고리 탭(개발/디자인/마케팅/비즈니스)을 눌러 실시간 필터링을 수행합니다.
 * 3. 정원이 초과된 강의(예: 15/15명)는 선택하지 못하도록 비활성화 처리하고 시각적 에러 상태를 제공합니다.
 * 4. 하단에서 '개인 신청(personal)' 또는 '단체 신청(group)'을 라디오 버튼으로 골라 다음 단계로 넘어가게 유도합니다.
 */
export const Step1CourseSelect: React.FC = () => {
  // 1) React Hook Form의 Context로부터 폼 제어 및 유효성 에러 상태를 수신합니다.
  const {
    watch,
    setValue,
    getValues, // getValues를 가져와 작성중인 폼 값을 체크
    formState: { errors }
  } = useFormContext<EnrollmentFormData>();

  // 2) 폼의 상태 중 '선택된 강의 ID'와 '신청 유형'을 실시간 감시(Watch)합니다.
  const selectedCourseId = watch('courseId');
  const enrollmentType = watch('enrollmentType');

  // 작성 중인 유의미한 데이터가 있는지 확인하여 불필요한 알럿 발생을 줄이는 헬퍼 함수
  const hasFilledData = () => {
    const values = getValues();
    if (values.name?.trim() || values.email?.trim() || values.phone?.trim() || values.motivation?.trim()) {
      return true;
    }
    if (values.group) {
      const g = values.group;
      if (g.organizationName?.trim() || g.contactPerson?.trim() || g.contactPhone?.trim()) {
        return true;
      }
      if (g.participants && g.participants.some(p => p.name?.trim() || p.email?.trim())) {
        return true;
      }
    }
    return false;
  };

  // 신청 유형 변경 전 확인창을 띄우는 함수 (높은 숙련도 요구사항)
  const handleTypeChange = (targetType: 'personal' | 'group') => {
    if (enrollmentType === targetType) return;

    if (hasFilledData()) {
      const confirmChange = window.confirm(
        '신청 유형을 변경하면 이미 작성하신 정보가 모두 초기화됩니다. 변경하시겠습니까?'
      );
      if (!confirmChange) {
        return;
      }
    }

    setValue('enrollmentType', targetType);
    if (targetType === 'personal') {
      setValue('group', undefined);
    } else {
      setValue('group', {
        organizationName: '',
        contactPerson: '',
        contactPhone: '',
        headCount: 2,
        participants: [
          { name: '', email: '' },
          { name: '', email: '' }
        ]
      });
    }
  };

  // 3) 카테고리 탭 상태 필터 ('all' | 'development' | 'design' | 'marketing' | 'business')
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // 4) TanStack Query를 사용하여 강좌 목록을 비동기 패칭합니다.
  const { data, isLoading, isError } = useQuery<CourseListResponse>({
    queryKey: ['courses', activeCategory],
    queryFn: async () => {
      const url = activeCategory === 'all' 
        ? '/api/courses' 
        : `/api/courses?category=${activeCategory}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('강좌 정보를 불러오는 중 에러가 발생했습니다.');
      }
      return response.json();
    }
  });

  // 카테고리 한글 매핑 헬퍼
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'development': return '개발';
      case 'design': return '디자인';
      case 'marketing': return '마케팅';
      case 'business': return '비즈니스';
      default: return category;
    }
  };

  // 금액 3자리 쉼표 포맷팅 헬퍼
  const formatPrice = (price: number) => {
    return price === 0 ? '무료' : `${price.toLocaleString()}원`;
  };

  // 날짜 포맷팅 헬퍼 (YYYY.MM.DD)
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>강의 및 신청 유형 선택</h2>
      <p className={styles.subtitle}>수강하실 강의를 고르고, 신청 유형을 선택해 주세요.</p>

      {/* ==========================================
          ① 카테고리 탭 메뉴 (Tab List)
          ========================================== */}
      <div className={styles.tabList}>
        {['all', 'development', 'design', 'marketing', 'business'].map((category) => (
          <button
            key={category}
            type="button"
            className={`${styles.tabBtn} ${activeCategory === category ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {category === 'all' ? '전체 강의' : getCategoryLabel(category)}
          </button>
        ))}
      </div>

      {/* ==========================================
          ② 강의 리스트 조회 결과 노출
          ========================================== */}
      <div className={styles.coursesSection}>
        {isLoading && (
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
            <p>강의 목록을 동기화하는 중입니다...</p>
          </div>
        )}

        {isError && (
          <div className={styles.errorAlert}>
            <AlertCircle size={20} />
            <p>강의 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.</p>
          </div>
        )}

        {!isLoading && !isError && data && (
          <div className={styles.courseGrid}>
            {data.courses.map((course: Course) => {
              const isFull = course.currentEnrollment >= course.maxCapacity;
              const isSelected = selectedCourseId === course.id;

              return (
                <div
                  key={course.id}
                  className={`${styles.courseCard} ${
                    isSelected ? styles.courseCardSelected : ''
                  } ${isFull ? styles.courseCardFull : ''}`}
                  onClick={() => {
                    // 정원이 꽉 차지 않은 경우에만 선택을 허용
                    if (!isFull) {
                      setValue('courseId', course.id, { shouldValidate: true });
                    }
                  }}
                >
                  {/* 정원 마감 상태 배지 */}
                  {isFull && <div className={styles.soldOutBadge}>정원 마감</div>}
                  
                  <div className={styles.cardHeader}>
                    <span className={styles.categoryBadge}>
                      {getCategoryLabel(course.category)}
                    </span>
                    <span className={styles.instructorText}>{course.instructor} 강사</span>
                  </div>

                  <h3 className={styles.courseTitle}>{course.title}</h3>
                  <p className={styles.courseDesc}>{course.description}</p>

                  <div className={styles.courseMeta}>
                    <div className={styles.metaRow}>
                      <Calendar size={14} />
                      <span>{formatDate(course.startDate)} ~ {formatDate(course.endDate)}</span>
                    </div>
                    
                    {/* 수강 정원 현황 바 */}
                    <div className={styles.capacityWrapper}>
                      <div className={styles.capacityText}>
                        <span>신청 현황</span>
                        <span className={isFull ? styles.fullText : ''}>
                          {course.currentEnrollment} / {course.maxCapacity}명
                        </span>
                      </div>
                      <div className={styles.capacityBarBg}>
                        <div 
                          className={`${styles.capacityBarGauge} ${isFull ? styles.gaugeFull : ''}`}
                          style={{ width: `${(course.currentEnrollment / course.maxCapacity) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.coursePrice}>{formatPrice(course.price)}</span>
                    {isSelected && (
                      <motion.div
                        layoutId="selectedCheck"
                        className={styles.selectedIndicator}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <CheckCircle2 size={20} className={styles.checkIcon} />
                      </motion.div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Zod 에러 표시 (선택된 강의가 없는 상태에서 다음 단계를 누르면 경고 출력) */}
        <AnimatePresence>
          {errors.courseId && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={styles.validationError}
            >
              {errors.courseId.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ==========================================
          ③ 신청 유형 선택 (개인 vs 단체)
          ========================================== */}
      <div className={styles.typeSection}>
        <h3 className={styles.sectionTitle}>신청 유형 선택</h3>
        
        <div className={styles.radioGrid}>
          {/* 개인 신청 카드 */}
          <label
            className={`${styles.radioCard} ${
              enrollmentType === 'personal' ? styles.radioCardSelected : ''
            }`}
          >
            <input
              type="radio"
              value="personal"
              className={styles.hiddenRadio}
              checked={enrollmentType === 'personal'}
              onChange={() => handleTypeChange('personal')}
            />
            <User size={24} className={styles.radioIcon} />
            <div className={styles.radioInfo}>
              <span className={styles.radioTitle}>개인 신청</span>
              <span className={styles.radioDesc}>1인 본인 수강 신청</span>
            </div>
          </label>

          {/* 단체 신청 카드 */}
          <label
            className={`${styles.radioCard} ${
              enrollmentType === 'group' ? styles.radioCardSelected : ''
            }`}
          >
            <input
              type="radio"
              value="group"
              className={styles.hiddenRadio}
              checked={enrollmentType === 'group'}
              onChange={() => handleTypeChange('group')}
            />
            <Users size={24} className={styles.radioIcon} />
            <div className={styles.radioInfo}>
              <span className={styles.radioTitle}>단체 신청</span>
              <span className={styles.radioDesc}>회사/학교 등 2명~10명 단체 수강</span>
            </div>
          </label>
        </div>

        <AnimatePresence>
          {errors.enrollmentType && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={styles.validationError}
            >
              {errors.enrollmentType.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
