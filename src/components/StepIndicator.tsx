import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import styles from './StepIndicator.module.css';

// -------------------------------------------------------------
// 1. StepIndicator 컴포넌트의 Props 타입 정의
// -------------------------------------------------------------
interface StepIndicatorProps {
  currentStep: number; // 현재 활성화되어 있는 스텝 번호 (1부터 시작)
  totalSteps: number;   // 전체 스텝의 총 개수
}

// 각 단계에 표시할 이름들 정의 (3단계 구성)
const STEP_NAMES = [
  '강의 선택',
  '정보 입력',
  '신청 확인'
];

/**
 * 📘 [주니어 개발자 해설]
 * StepIndicator는 사용자가 다단계 폼의 전체 과정 중 "어디쯤 와있는지" 시각적으로 보여주는 컴포넌트입니다.
 * 
 * - 완료된 단계: 체크 아이콘(Check)과 함께 하이라이트 표시
 * - 진행 중인 단계: 현재 포커싱 및 펄스(Pulse) 애니메이션
 * - 대기 중인 단계: 차분한 비활성화 스타일
 */
export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  return (
    <div className={styles.container}>
      {/* 1) 스텝들을 가로로 나열하는 래퍼 */}
      <div className={styles.stepsWrapper}>
        
        {/* 스텝 사이사이를 이어주는 진행률 상태 배경 바 */}
        <div className={styles.progressBarBg}>
          {/* 실제로 진행된 만큼 늘어나는 액티브 바 (Framer Motion으로 너비 애니메이션 적용) */}
          <motion.div 
            className={styles.progressBarActive}
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>

        {/* 2) 각 단계 서클들을 생성 */}
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber; // 이미 통과한 스텝인가?
          const isActive = currentStep === stepNumber;   // 지금 머물러 있는 스텝인가?

          return (
            <div key={stepNumber} className={styles.stepItem}>
              {/* 스텝 숫자/체크마크가 들어갈 동그란 서클 */}
              <div 
                className={`${styles.stepCircle} ${
                  isCompleted ? styles.completed : ''
                } ${
                  isActive ? styles.active : ''
                }`}
              >
                {/* 
                  - 완료되었으면 체크 아이콘 표시 (서서히 스케일이 커지며 등장)
                  - 진행 중이거나 대기 중이면 숫자 표시
                */}
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Check size={16} strokeWidth={3} className={styles.checkIcon} />
                  </motion.div>
                ) : (
                  <span className={styles.stepNumText}>{stepNumber}</span>
                )}

                {/* 현재 활성화된 스텝 서클의 바깥쪽 테두리에 빛나는 펄스(Pulse) 애니메이션 링 */}
                {isActive && (
                  <motion.div 
                    className={styles.pulseRing}
                    layoutId="pulseRing"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </div>

              {/* 스텝 하단에 들어갈 글자 라벨 (예: "기본 정보") */}
              <span 
                className={`${styles.stepLabel} ${
                  isActive ? styles.labelActive : ''
                } ${
                  isCompleted ? styles.labelCompleted : ''
                }`}
              >
                {STEP_NAMES[index]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
