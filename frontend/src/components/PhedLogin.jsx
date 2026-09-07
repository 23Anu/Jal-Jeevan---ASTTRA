import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Lock, Smartphone, CreditCard, ArrowRight, CheckCircle2, 
  AlertCircle, RefreshCw, KeyRound, Building2, UserCheck, Sparkles, ChevronLeft,
  Info, BellRing, Check, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function PhedLogin({ onLoginSuccess, onCancel }) {
  const { sendOtp, verifyOtp, officersList } = useAuth();
  const { lang, t } = useLanguage();

  const isHindi = lang === 'hi' || lang === 'kht' || lang === 'nag';

  // Modes: 'phone' or 'id_card'
  const [authMode, setAuthMode] = useState('phone');
  const [identifier, setIdentifier] = useState('');
  
  // Step: 1 = Enter ID/Phone, 2 = Enter OTP, 3 = Verified
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // OTP state
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [receivedOtpData, setReceivedOtpData] = useState(null);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Focus ref for first OTP box
  const otpInputsRef = useRef([]);

  // Timer countdown
  useEffect(() => {
    let timer;
    if (step === 2 && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  // Focus first OTP input when step 2 opens
  useEffect(() => {
    if (step === 2 && otpInputsRef.current[0]) {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 200);
    }
  }, [step]);

  // Handle Send OTP
  const handleSendOtp = async (customId = null) => {
    const targetId = customId || identifier.trim();
    if (!targetId) {
      setError(
        authMode === 'phone' 
          ? (isHindi ? 'कृपया वैध 10-अंकीय मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number')
          : (isHindi ? 'कृपया विभागीय पहचान पत्र (ID Card No.) दर्ज करें' : 'Please enter official Government ID Card No.')
      );
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await sendOtp(targetId);
      setLoading(false);

      if (res.success) {
        setReceivedOtpData(res);
        setStep(2);
        setResendTimer(30);
        setCanResend(false);
        setOtpValues(['', '', '', '', '', '']);
      } else {
        setError(res.error || (isHindi ? 'ओटीपी भेजने में त्रुटि हुई' : 'Failed to send OTP. Please try again.'));
      }
    } catch (err) {
      setLoading(false);
      setError(isHindi ? 'सर्वर से संपर्क नहीं हो सका' : 'Could not connect to authentication server');
    }
  };

  // Quick Select Officer
  const handleSelectOfficer = (officer) => {
    const val = authMode === 'phone' ? officer.phone.replace(/[^0-9]/g, '').slice(-10) : officer.id_card_no;
    setIdentifier(val);
    handleSendOtp(val);
  };

  // Handle individual OTP input changes
  const handleOtpChange = (index, value) => {
    // Only allow numbers
    const cleanVal = value.replace(/[^0-9]/g, '');
    if (!cleanVal && value !== '') return;

    const newOtp = [...otpValues];

    // If pasted multi-character string
    if (cleanVal.length > 1) {
      const chars = cleanVal.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = chars[i] || '';
      }
      setOtpValues(newOtp);
      const nextIndex = Math.min(chars.length, 5);
      otpInputsRef.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = cleanVal.slice(-1);
    setOtpValues(newOtp);

    // Auto move focus to next input
    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  // Handle Backspace navigation across inputs
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Auto Fill Received OTP Helper
  const handleAutoFillOtp = () => {
    if (receivedOtpData && receivedOtpData.otp) {
      const chars = receivedOtpData.otp.toString().slice(0, 6).split('');
      const filled = ['', '', '', '', '', ''];
      chars.forEach((c, i) => { filled[i] = c; });
      setOtpValues(filled);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
      otpInputsRef.current[5]?.focus();
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otpValues.join('');

    if (fullOtp.length < 6) {
      setError(isHindi ? 'कृपया पूरा 6-अंकीय ओटीपी दर्ज करें' : 'Please enter the complete 6-digit OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await verifyOtp(identifier, fullOtp);
      setLoading(false);

      if (res.success) {
        setStep(3);
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(res.user);
        }, 1200);
      } else {
        setError(res.error || (isHindi ? 'अमान्य ओटीपी कोड। कृपया पुन: प्रयास करें।' : 'Invalid OTP. Please check and re-enter.'));
      }
    } catch (err) {
      setLoading(false);
      setError(isHindi ? 'सत्यापन विफल रहा' : 'Verification failed');
    }
  };

  return (
    <div className="phed-auth-overlay">
      <div className="phed-auth-modal">
        
        {/* Modal Top Ribbon Header */}
        <div className="phed-auth-header">
          <div className="phed-auth-emblem">
            <div className="emblem-circle">
              <Building2 size={24} className="text-white" />
            </div>
            <div className="emblem-text">
              <span className="emblem-gov">{isHindi ? 'झारखंड सरकार • पेयजल एवं स्वच्छता विभाग' : 'Govt. of Jharkhand • DW&SD'}</span>
              <h2 className="emblem-title">{isHindi ? 'पी.एच.ई.डी. आधिकारिक पोर्टल प्रवेश' : 'PHED Official Command Gateway'}</h2>
            </div>
          </div>
          {onCancel && (
            <button className="phed-auth-close" onClick={onCancel} title="Close / Back">
              ✕
            </button>
          )}
        </div>

        {/* Security Trust Strip */}
        <div className="phed-trust-strip">
          <div className="trust-item">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>{isHindi ? 'दो-चरणीय OTP सुरक्षित लॉगिन' : 'Two-Factor OTP Verified'}</span>
          </div>
          <div className="trust-item">
            <Lock size={13} className="text-blue-600" />
            <span>{isHindi ? '256-बिट एन्क्रिप्शन' : 'Govt. TLS Encrypted'}</span>
          </div>
          <div className="trust-item">
            <span className="badge-sih">SIH26040 IoT Cloud</span>
          </div>
        </div>

        {/* Body Form */}
        <div className="phed-auth-body">

          {/* STEP 1: Identification Input */}
          {step === 1 && (
            <div className="auth-step-container">
              
              {/* Method Selector Tabs */}
              <div className="auth-mode-selector">
                <button 
                  type="button"
                  className={`auth-mode-btn ${authMode === 'phone' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('phone'); setError(''); }}
                >
                  <Smartphone size={16} />
                  <span>{isHindi ? 'मोबाइल नंबर से' : 'Mobile Number'}</span>
                </button>

                <button 
                  type="button"
                  className={`auth-mode-btn ${authMode === 'id_card' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('id_card'); setError(''); }}
                >
                  <CreditCard size={16} />
                  <span>{isHindi ? 'आईडी कार्ड नंबर' : 'Official ID Card No.'}</span>
                </button>
              </div>

              {/* Input Form */}
              <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="auth-form-fields">
                <label className="auth-input-label">
                  {authMode === 'phone' ? (
                    <>
                      <span>{isHindi ? 'पंजीकृत मोबाइल नंबर' : 'Registered Mobile Number'}</span>
                      <span className="text-subtle"> (+91)</span>
                    </>
                  ) : (
                    <>
                      <span>{isHindi ? 'अधिकारी पहचान पत्र संख्या' : 'Government Officer ID Card No.'}</span>
                      <span className="text-subtle"> (e.g. JH-PHED-8842)</span>
                    </>
                  )}
                </label>

                <div className="auth-input-group">
                  {authMode === 'phone' ? (
                    <>
                      <span className="input-prefix">🇮🇳 +91</span>
                      <input 
                        type="tel"
                        placeholder="94311 23456"
                        maxLength="10"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value.replace(/[^0-9]/g, ''))}
                        className="auth-text-input phone-input"
                        autoFocus
                      />
                    </>
                  ) : (
                    <>
                      <span className="input-prefix-icon"><CreditCard size={18} /></span>
                      <input 
                        type="text"
                        placeholder="JH-PHED-8842 / DWSD-HQ-001"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                        className="auth-text-input id-input"
                        autoFocus
                      />
                    </>
                  )}
                </div>

                {error && (
                  <div className="auth-error-banner">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="auth-primary-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>{isHindi ? 'ओटीपी भेजा जा रहा है...' : 'Generating Official OTP...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isHindi ? 'ओटीपी प्राप्त करें' : 'Get Verification OTP'}</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

              {/* 1-Click Official Account Quick Selector Chips */}
              <div className="auth-quick-select">
                <div className="quick-select-header">
                  <UserCheck size={14} className="text-emerald-600" />
                  <span>{isHindi ? 'त्वरित परीक्षण हेतु अधिकारी चुनें (1-Click Test)' : '1-Click Quick Select Official Account:'}</span>
                </div>

                <div className="officer-chips-grid">
                  {officersList.map((off) => (
                    <button
                      key={off.id_card_no || off.phone}
                      type="button"
                      className="officer-chip-card"
                      onClick={() => handleSelectOfficer(off)}
                    >
                      <div className="chip-avatar">
                        {off.role === 'ADMIN' ? '🏛️' : off.role === 'GP_VWSC' ? '🚰' : '👨‍💼'}
                      </div>
                      <div className="chip-details">
                        <span className="chip-name">{off.full_name}</span>
                        <span className="chip-role">{off.designation || off.role}</span>
                        <div className="chip-meta">
                          <span className="chip-id">{off.id_card_no}</span>
                          <span className="chip-phone">📱 {off.phone.replace('+91-', '')}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: Enter OTP Screen */}
          {step === 2 && (
            <div className="auth-step-container">
              
              {/* Back to Step 1 Button */}
              <button 
                type="button" 
                className="auth-back-link"
                onClick={() => { setStep(1); setError(''); }}
              >
                <ChevronLeft size={16} />
                <span>{isHindi ? 'नंबर / आईडी बदलें' : 'Change Number / ID'}</span>
              </button>

              {/* Officer Profile Identified Banner */}
              {receivedOtpData && receivedOtpData.officer && (
                <div className="officer-identified-card">
                  <div className="identified-avatar">
                    <UserCheck size={20} className="text-emerald-700" />
                  </div>
                  <div className="identified-info">
                    <h4 className="identified-name">{receivedOtpData.officer.full_name}</h4>
                    <p className="identified-desc">
                      {receivedOtpData.officer.designation} • <strong>{receivedOtpData.officer.id_card_no}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Live SMS Simulation Callout */}
              <div className="sms-simulation-box">
                <div className="sms-sim-header">
                  <div className="flex items-center gap-2">
                    <BellRing size={15} className="text-amber-600 animate-bounce" />
                    <strong>{isHindi ? 'झारखंड सरकार SMS संदेश (सिमुलेटर)' : 'Govt SMS Gateway Simulator'}</strong>
                  </div>
                  <span className="sms-tag">JH-PHED</span>
                </div>
                <div className="sms-sim-body">
                  <p className="sms-text">
                    {isHindi 
                      ? `जल विभाग पोर्टल लॉगिन OTP है: ` 
                      : `Your DW&SD Portal Login OTP is: `}
                    <strong className="sms-otp-highlight">{receivedOtpData?.otp || '123456'}</strong>.
                    <span className="sms-expiry"> (Valid for 5 mins)</span>
                  </p>
                  <button 
                    type="button" 
                    className="auto-fill-btn"
                    onClick={handleAutoFillOtp}
                  >
                    {copiedOtp ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        <span>{isHindi ? 'ओटीपी भरा गया!' : 'OTP Filled!'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} className="text-amber-500" />
                        <span>{isHindi ? '⚡ 1-क्लिक ऑटो-फिल OTP' : '⚡ 1-Click Auto Fill OTP'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 6-Digit OTP Input Boxes */}
              <form onSubmit={handleVerifyOtp} className="otp-form">
                <label className="auth-input-label text-center">
                  {isHindi ? 'प्राप्त 6-अंकीय सुरक्षा कोड दर्ज करें' : 'Enter 6-Digit Verification Code'}
                </label>

                <div className="otp-boxes-wrapper">
                  {otpValues.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => otpInputsRef.current[idx] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className={`otp-digit-input ${digit ? 'filled' : ''}`}
                    />
                  ))}
                </div>

                {error && (
                  <div className="auth-error-banner">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Resend OTP Row */}
                <div className="otp-resend-row">
                  {canResend ? (
                    <button 
                      type="button" 
                      className="resend-btn active"
                      onClick={() => handleSendOtp(identifier)}
                    >
                      <RefreshCw size={13} />
                      <span>{isHindi ? 'पुन: ओटीपी भेजें' : 'Resend OTP'}</span>
                    </button>
                  ) : (
                    <span className="resend-timer-text">
                      {isHindi ? `ओटीपी पुन: भेजने का समय: ` : `Resend OTP in: `}
                      <strong>{resendTimer}s</strong>
                    </span>
                  )}

                  <span className="master-otp-hint">
                    💡 Master Test OTP: <code>123456</code>
                  </span>
                </div>

                <button 
                  type="submit" 
                  className="auth-primary-btn verify-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>{isHindi ? 'सत्यापित हो रहा है...' : 'Verifying Security Token...'}</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={17} />
                      <span>{isHindi ? 'ओटीपी सत्यापित करें एवं पोर्टल खोलें' : 'Verify OTP & Launch PHED Portal'}</span>
                    </>
                  )}
                </button>
              </form>

            </div>
          )}

          {/* STEP 3: Verification Success Animation */}
          {step === 3 && (
            <div className="auth-success-screen">
              <div className="success-icon-pulse">
                <CheckCircle2 size={48} className="text-emerald-500 animate-bounce" />
              </div>
              <h3 className="success-title">
                {isHindi ? 'पहचान सत्यापित! पोर्टल खुल रहा है...' : 'Identity Verified! Access Granted'}
              </h3>
              <p className="success-desc">
                {isHindi ? 'स्वागत है' : 'Welcome'} <strong>{receivedOtpData?.officer?.full_name || 'Officer'}</strong>
              </p>
              <div className="auth-loading-bar">
                <div className="auth-loading-fill"></div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Security Notice */}
        <div className="phed-auth-footer">
          <Info size={13} className="text-slate-400" />
          <span>
            {isHindi 
              ? 'यह पोर्टल केवल अधिकृत PHED/DWSD अधिकारियों के लिए है। अनधिकृत पहुंच कानूनन दंडनीय है।'
              : 'Authorized PHED/DW&SD Government Personnel Only. IT Act 2000 compliant.'}
          </span>
        </div>

      </div>
    </div>
  );
}
