import { useState } from 'react';

function App() {
  const [step, setStep] = useState(1);

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <main className="glass-card">
      {/* 카드 상단 헤더 */}
      <h1>수강 신청 시스템</h1>
      <p className="subtitle">다단계 폼을 통해 빠르고 간편하게 수강을 신청해 보세요.</p>

      {/* 스텝 표시기 플레이스홀더 */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: '600' }}>
          STEP {step} / 4
        </div>
        <div style={{ 
          height: '6px', 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '3px', 
          marginTop: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            height: '100%', 
            width: `${(step / 4) * 100}%`, 
            background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
            transition: 'width 0.4s ease'
          }}></div>
        </div>
      </div>

      {/* 스텝별 폼 예시 콘텐츠 */}
      <div style={{ minHeight: '260px', marginBottom: '32px' }}>
        {step === 1 && (
          <div className="step-content">
            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: 'var(--text-primary)' }}>1단계: 기본 정보 입력</h2>
            
            <div className="form-group">
              <label className="form-label">이름 <span className="required">*</span></label>
              <input type="text" className="form-input" placeholder="홍길동" />
            </div>

            <div className="form-group">
              <label className="form-label">이메일 <span className="required">*</span></label>
              <input type="email" className="form-input" placeholder="example@liveklass.com" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: 'var(--text-primary)' }}>2단계: 수강 과목 선택</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>과목 정보 로딩 및 분류 선택이 들어갈 예정입니다.</p>
          </div>
        )}

        {step === 3 && (
          <div className="step-content">
            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: 'var(--text-primary)' }}>3단계: 추가 옵션 및 약관 동의</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>알림 설정 및 할인 대상 증빙 업로드가 들어갈 예정입니다.</p>
          </div>
        )}

        {step === 4 && (
          <div className="step-content">
            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: 'var(--text-primary)' }}>4단계: 신청 정보 최종 확인</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>입력한 내용을 한눈에 검토하고 최종 신청을 완료합니다.</p>
          </div>
        )}
      </div>

      {/* 하단 네비게이션 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={prevStep}
          disabled={step === 1}
        >
          이전 단계
        </button>
        
        {step < 4 ? (
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={nextStep}
          >
            다음 단계
          </button>
        ) : (
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => alert('신청 제출 완료!')}
            style={{ background: 'var(--success)', boxShadow: '0 4px 14px 0 rgba(34, 197, 94, 0.4)' }}
          >
            신청서 제출
          </button>
        )}
      </div>
    </main>
  );
}

export default App;
