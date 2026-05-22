import React, { useEffect } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, Users, FileText, PhoneCall } from 'lucide-react';
import type { EnrollmentFormInput } from '../../types/form';
import styles from './Step2StudentInfo.css.module.css';

/**
 * 📘 [주니어 개발자 해설]
 * Step2StudentInfo는 3단계 구성 중 '2단계: 수강생 정보 입력'을 처리합니다.
 * 
 * 1. 이름, 이메일, 전화번호, 수강 동기(최대 300자) 등의 기본 신상 정보를 입력받습니다.
 * 2. 1단계에서 사용자가 '단체 신청(group)'을 골랐는지를 감시(`watch('enrollmentType')`)하여, 
 *    단체 정보 입력 폼(단체명, 대표 담당자 성함, 신청 인원수 2~10명, 참가자 리스트, 담당자 연락처)을 자동으로 열어줍니다.
 * 3. 단체 신청 인원수(`group.headCount`)를 변경하면 참가자 명단(이름, 이메일) 인풋 박스가 자동으로 늘어나거나 줄어들도록
 *    `useFieldArray`를 활용해 실시간 동기화 효과를 줍니다.
 */
export const Step2StudentInfo: React.FC = () => {
  // 1) React Hook Form의 Context로부터 폼 정보 및 유효성 에러 등을 받아옵니다.
  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors }
  } = useFormContext<EnrollmentFormInput>();

  // 2) 1단계에서 선택했던 '신청 유형'과 '신청 인원수'를 실시간 감시합니다.
  const enrollmentType = watch('enrollmentType');
  const headCount = watch('group.headCount');

  // RHF register 반환값 저장 (커스텀 onChange와 겹침 해결)
  const headCountRegister = register('group.headCount', { valueAsNumber: true });

  // 3) useFieldArray를 통해 동적으로 개수가 변하는 참가자 명단(이름 + 이메일) 필드를 바인딩합니다.
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'group.participants'
  });

  // 4) [동적 명단 동기화] 신청 인원수가 바뀔 때마다 아래 명단 필드의 개수를 자동으로 맞추어 줍니다. (2명 ~ 10명 제한)
  // fields.length 대신 getValues를 통해 무한 리렌더링 및 의존성 순환 루프 제거
  useEffect(() => {
    if (enrollmentType === 'group') {
      const count = Number(headCount) || 0;
      const currentParticipants = getValues('group.participants') || [];
      const currentLength = currentParticipants.length;

      // 2~10명 사이인 경우에만 동기화 처리 진행
      if (count >= 2 && count <= 10) {
        if (count > currentLength) {
          // 인원이 늘어났을 시 빈 참가자 객체 추가
          for (let i = currentLength; i < count; i++) {
            append({ name: '', email: '' });
          }
        } else if (count < currentLength) {
          // 인원이 줄어들었을 시 마지막부터 참가자 필드 제거
          for (let i = currentLength - 1; i >= count; i--) {
            remove(i);
          }
        }
      }
    }
  }, [headCount, enrollmentType, append, remove, getValues]);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>수강생 정보 입력</h2>
      <p className={styles.subtitle}>수강 신청서 접수를 위해 아래 필수 및 선택 정보를 기입해 주세요.</p>

      {/* ==========================================
          ① 수강생 공통 정보 필드 (이름, 이메일, 연락처)
          ========================================== */}
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="name">
          이름 <span className={styles.required}>*</span>
        </label>
        <div className={styles.inputWrapper}>
          <User className={styles.inputIcon} size={18} />
          <input
            id="name"
            type="text"
            className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
            placeholder="홍길동"
            {...register('name')}
          />
        </div>
        <AnimatePresence>
          {errors.name && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={styles.errorMessage}
            >
              {errors.name.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="email">
          이메일 <span className={styles.required}>*</span>
        </label>
        <div className={styles.inputWrapper}>
          <Mail className={styles.inputIcon} size={18} />
          <input
            id="email"
            type="email"
            className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
            placeholder="example@liveklass.com"
            {...register('email')}
          />
        </div>
        <AnimatePresence>
          {errors.email && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={styles.errorMessage}
            >
              {errors.email.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="phone">
          전화번호 <span className={styles.required}>*</span>
        </label>
        <div className={styles.inputWrapper}>
          <Phone className={styles.inputIcon} size={18} />
          <input
            id="phone"
            type="text"
            className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
            placeholder="010-1234-5678"
            {...register('phone')}
          />
        </div>
        <AnimatePresence>
          {errors.phone && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={styles.errorMessage}
            >
              {errors.phone.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ==========================================
          ② [조건부 필드] 단체 신청 시 추가 정보 입력 영역
          ========================================== */}
      <AnimatePresence>
        {enrollmentType === 'group' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className={styles.accordionContent}
          >
            <div className={styles.groupFormWrapper}>
              <h3 className={styles.groupTitle}>단체 신청 추가 정보</h3>

              {/* 단체명 */}
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="orgName">
                  단체명 <span className={styles.required}>*</span>
                </label>
                <input
                  id="orgName"
                  type="text"
                  className={`${styles.input} ${styles.singleInput} ${
                    errors.group?.organizationName ? styles.inputError : ''
                  }`}
                  placeholder="회사명 또는 학교명을 입력해 주세요."
                  {...register('group.organizationName')}
                />
                {errors.group?.organizationName && (
                  <p className={styles.errorMessage}>{errors.group.organizationName.message}</p>
                )}
              </div>

              {/* 대표 담당자 이름 */}
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="contactPerson">
                  대표 연락 담당자 성함 <span className={styles.required}>*</span>
                </label>
                <input
                  id="contactPerson"
                  type="text"
                  className={`${styles.input} ${styles.singleInput} ${
                    errors.group?.contactPerson ? styles.inputError : ''
                  }`}
                  placeholder="담당자 성함을 기입해 주세요."
                  {...register('group.contactPerson')}
                />
                {errors.group?.contactPerson && (
                  <p className={styles.errorMessage}>{errors.group.contactPerson.message}</p>
                )}
              </div>

              {/* 담당자 연락처 (신규 요구사항) */}
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="contactPhone">
                  담당자 연락처 <span className={styles.required}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <PhoneCall className={styles.inputIcon} size={18} />
                  <input
                    id="contactPhone"
                    type="text"
                    className={`${styles.input} ${
                      errors.group?.contactPhone ? styles.inputError : ''
                    }`}
                    placeholder="010-1234-5678"
                    {...register('group.contactPhone')}
                  />
                </div>
                {errors.group?.contactPhone && (
                  <p className={styles.errorMessage}>{errors.group.contactPhone.message}</p>
                )}
              </div>

              {/* 신청 인원수 (요구사항: 2명 ~ 10명) */}
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="headCount">
                  신청 인원수 (2명 ~ 10명) <span className={styles.required}>*</span>
                </label>
                <div className={styles.headCountRow}>
                  <input
                    id="headCount"
                    type="number"
                    min={2}
                    max={10}
                    className={`${styles.input} ${styles.headCountInput} ${
                      errors.group?.headCount ? styles.inputError : ''
                    }`}
                    {...headCountRegister}
                    onChange={async (e) => {
                      // 1) RHF의 기본 onChange 동작 실행 (타입 캐스팅 및 상태 갱신 보장)
                      await headCountRegister.onChange(e);
                      // 2) 커스텀 onChange 로직 실행 (인원 변경 즉시 유효성 재검증 수행)
                      const val = Number(e.target.value);
                      setValue('group.headCount', val, { shouldValidate: true });
                    }}
                  />
                  <span className={styles.tipText}>인원을 변경하면 아래 참가자 명단 칸이 즉시 증감합니다.</span>
                </div>
                {errors.group?.headCount && (
                  <p className={styles.errorMessage}>{errors.group.headCount.message}</p>
                )}
              </div>

              {/* 동적 참가자 명단 입력 */}
              <div className={styles.participantsSection}>
                <div className={styles.participantsHeader}>
                  <Users size={16} className={styles.subIcon} />
                  <h4>참가자 명단 입력 ({fields.length}명)</h4>
                </div>

                <div className={styles.participantsGrid}>
                  {fields.map((field, index) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={styles.participantRow}
                    >
                      <span className={styles.rowNum}>{index + 1}</span>

                      {/* 이름 입력 */}
                      <div className={styles.rowField}>
                        <input
                          type="text"
                          className={`${styles.input} ${styles.rowInput} ${
                            errors.group?.participants?.[index]?.name ? styles.inputError : ''
                          }`}
                          placeholder="이름"
                          {...register(`group.participants.${index}.name` as const)}
                        />
                        {errors.group?.participants?.[index]?.name && (
                          <span className={styles.rowError}>
                            {errors.group.participants[index]?.name?.message}
                          </span>
                        )}
                      </div>

                      {/* 이메일 입력 */}
                      <div className={styles.rowField}>
                        <input
                          type="email"
                          className={`${styles.input} ${styles.rowInput} ${
                            errors.group?.participants?.[index]?.email ? styles.inputError : ''
                          }`}
                          placeholder="이메일 주소"
                          {...register(`group.participants.${index}.email` as const)}
                        />
                        {errors.group?.participants?.[index]?.email && (
                          <span className={styles.rowError}>
                            {errors.group.participants[index]?.email?.message}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          ③ 수강 동기 입력 필드 (선택, 최대 300자)
          ========================================== */}
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="motivation">
          수강 동기 (선택, 최대 300자)
        </label>
        <div className={styles.textareaWrapper}>
          <FileText className={styles.textareaIcon} size={18} />
          <textarea
            id="motivation"
            className={`${styles.textarea} ${errors.motivation ? styles.inputError : ''}`}
            placeholder="이번 과정 수강을 희망하시는 이유를 간략히 적어주세요. (최대 300자)"
            {...register('motivation')}
          />
        </div>
        <AnimatePresence>
          {errors.motivation && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={styles.errorMessage}
            >
              {errors.motivation.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
