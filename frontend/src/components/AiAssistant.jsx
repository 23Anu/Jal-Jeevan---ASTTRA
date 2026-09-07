import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bot, Sparkles, Send, X, Volume2, VolumeX, CheckCircle2, XCircle, 
  MapPin, PhoneCall, RefreshCw, MessageSquare, ShieldCheck,
  ChevronRight, Mic, MicOff, AlertTriangle, Radio, Square, Play
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function AiAssistant({ activeUnit }) {
  const { t, lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: lang === 'hi' 
        ? 'नमस्ते! मैं **जल-मित्र भारतीय वॉइस AI (Jal-Mitra Indian Voice AI)** हूँ।\nआप माइक (🎙️) दबाकर हिंदी, इंग्लिश या हिंग्लिश में बोल सकते हैं, मैं प्राकृतिक भारतीय आवाज़ में ही जवाब दूंगा!'
        : 'Hello! I am **Jal-Mitra Indian Voice AI Assistant**.\nYou can speak in English, Hindi, or Hinglish via the microphone (🎙️), and I will reply in a natural Indian voice!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      data: null
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickQuestions, setQuickQuestions] = useState([]);
  
  // Voice states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoVoiceReply, setAutoVoiceReply] = useState(true);
  const [voiceError, setVoiceError] = useState(null);
  const [activeSpeakingMsgId, setActiveSpeakingMsgId] = useState(null);

  const recognitionRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Fetch quick prompt chips
  useEffect(() => {
    fetch('/api/ai/quick-questions')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setQuickQuestions(data.questions);
        }
      })
      .catch(err => console.error('Error loading AI prompts:', err));
  }, []);

  // Pre-load Browser Speech Voices
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Stop any active speech (Both HTML5 Audio and Web Speech Synthesis)
  const stopAllAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setActiveSpeakingMsgId(null);
  }, []);

  // Natural Indian Voice Selector for Web Speech API
  const getBestIndianVoice = (isHindiTarget) => {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    if (isHindiTarget) {
      // 1. Prioritize natural Hindi Indian voices
      const hindiVoice = voices.find(v => 
        v.lang === 'hi-IN' || 
        v.lang === 'hi_IN' ||
        v.name.includes('Google हिन्दी') || 
        v.name.includes('Swara') || 
        v.name.includes('Madhur') ||
        v.name.toLowerCase().includes('hindi')
      );
      if (hindiVoice) return hindiVoice;
    } else {
      // 2. Prioritize natural Indian English voices
      const indianEngVoice = voices.find(v => 
        v.lang === 'en-IN' || 
        v.lang === 'en_IN' ||
        v.name.includes('Google Indian English') || 
        v.name.includes('Neerja') || 
        v.name.includes('Prabhat') ||
        v.name.toLowerCase().includes('india')
      );
      if (indianEngVoice) return indianEngVoice;
    }

    // 3. Fallback to any en-IN or hi-IN
    const regionalFallback = voices.find(v => v.lang.startsWith('hi') || v.lang.includes('IN'));
    return regionalFallback || voices[0];
  };

  // Natural Indian Voice Player (Neural MP3 or Native Indian Voice)
  const playIndianVoice = useCallback((ttsPayload, msgId = null) => {
    stopAllAudio();
    if (msgId) setActiveSpeakingMsgId(msgId);
    setVoiceError(null);

    // 1. Google Cloud Neural2 / WaveNet Indian Base64 Audio Playback
    if (ttsPayload?.audioBase64) {
      try {
        const audioUrl = `data:${ttsPayload.mimeType || 'audio/mp3'};base64,${ttsPayload.audioBase64}`;
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          setActiveSpeakingMsgId(null);
        };
        audio.onerror = (e) => {
          console.warn('Audio playback error, falling back to browser voice:', e);
          fallbackBrowserSpeech(ttsPayload.cleanedText || ttsPayload.text);
        };

        audio.play().catch(err => {
          console.warn('Auto-play error:', err);
          fallbackBrowserSpeech(ttsPayload.cleanedText || ttsPayload.text);
        });
        return;
      } catch (err) {
        console.warn('Error playing base64 audio:', err);
      }
    }

    // 2. High-Quality Browser Native Indian Voice Synthesis
    fallbackBrowserSpeech(ttsPayload?.cleanedText || ttsPayload?.text || (typeof ttsPayload === 'string' ? ttsPayload : ''));
  }, [stopAllAudio]);

  // Browser Speech Synthesis with Indian Voice
  const fallbackBrowserSpeech = (textToSpeak) => {
    if (!window.speechSynthesis || !textToSpeak) {
      setIsSpeaking(false);
      setActiveSpeakingMsgId(null);
      return;
    }

    const cleanText = textToSpeak
      .replace(/[*#_`~]/g, '')
      .replace(/[📍🟢🔴⚪⚠️📊•✨💡]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const isHindiTarget = lang === 'hi' || /[अ-ह]/.test(cleanText) || /kya|pani|peene|layak|kaisa/.test(cleanText.toLowerCase());
    const indianVoice = getBestIndianVoice(isHindiTarget);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.96; // Natural Indian conversational pacing
    utterance.pitch = 1.0;
    utterance.lang = isHindiTarget ? 'hi-IN' : 'en-IN';

    if (indianVoice) {
      utterance.voice = indianVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setActiveSpeakingMsgId(null);
    };
    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      setIsSpeaking(false);
      setActiveSpeakingMsgId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Microphone Voice Input (Speech-to-Text supporting Hindi, English & Hinglish)
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Speech recognition is not supported in this browser. Please type your message.');
      setTimeout(() => setVoiceError(null), 5000);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    stopAllAudio();
    setVoiceError(null);

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      // Use Indian English or Hindi based on language context
      recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        if (transcript) {
          setInputQuery(transcript);
          // Auto submit voice query
          handleSendQuery(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition event error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission denied. Please allow microphone access in your browser.');
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech detected. Please speak clearly into the microphone.');
        } else {
          setVoiceError(`Voice input error (${event.error}). Please try again.`);
        }
        setTimeout(() => setVoiceError(null), 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
      setVoiceError('Could not start microphone. Please try typing.');
      setTimeout(() => setVoiceError(null), 5000);
    }
  };

  // Handle Query Submission (One-Trip RAG + Indian Voice Synthesis)
  const handleSendQuery = async (queryText) => {
    const q = (queryText || inputQuery).trim();
    if (!q || loading) return;

    stopAllAudio();

    const newMsgId = `msg-${Date.now()}`;
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      // Combined RAG + Indian Voice route for minimal latency
      const res = await fetch('/api/ai/voice-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, lang })
      });
      const data = await res.json();

      if (data.success) {
        const botMsg = {
          id: newMsgId,
          sender: 'bot',
          text: data.answer,
          advice: data.advice,
          source: data.source || null,
          unitData: data.unitData || null,
          queryType: data.queryType,
          isSafe: data.isSafe,
          tts: data.tts || null,
          spokenSummary: data.spokenSummary || data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, botMsg]);

        // Auto-play Indian Voice Reply if enabled
        if (autoVoiceReply) {
          playIndianVoice(data.tts || { text: data.spokenSummary }, newMsgId);
        }
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'bot',
            text: 'Sorry, I could not retrieve sensor telemetry right now. Please try again.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: 'Error connecting to RAG database: ' + err.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 1. Floating AI Assistant Trigger Pill (Bottom-Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, var(--primary) 0%, #1E0C4F 100%)',
            color: '#FFFFFF',
            border: '2px solid rgba(255, 213, 79, 0.7)',
            borderRadius: '32px',
            padding: '12px 22px',
            boxShadow: '0 8px 25px rgba(41, 19, 108, 0.4)',
            zIndex: 1500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 800,
            fontSize: '0.92rem',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="ai-floating-btn"
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#FFD54F',
            color: '#1E0C4F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Mic size={16} />
          </div>
          <span>{lang === 'hi' ? 'भारतीय वॉइस AI से बात करें' : 'Talk with Indian Voice AI'}</span>
          <span style={{
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.72rem',
            color: '#FFD54F',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <Radio size={10} /> 2-Way Voice
          </span>
        </button>
      )}

      {/* 2. Interactive AI Assistant Chatbot Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '430px',
          maxWidth: 'calc(100vw - 32px)',
          height: '630px',
          maxHeight: 'calc(100vh - 48px)',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 16px 40px rgba(14, 4, 43, 0.35)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 2500,
          overflow: 'hidden',
          animation: 'fadeIn 0.25s ease'
        }}>
          
          {/* Header with Live Voice & Equalizer Indicator */}
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, #1E0C4F 100%)',
            color: '#FFFFFF',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: isListening ? '#D32F2F' : isSpeaking ? '#1B8A5A' : '#FFD54F',
                color: isListening || isSpeaking ? '#FFFFFF' : '#1E0C4F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                transition: 'all 0.3s'
              }}>
                {isListening ? (
                  <Mic size={20} className="animate-pulse" />
                ) : isSpeaking ? (
                  <div className="voice-equalizer">
                    <span className="voice-equalizer-bar" style={{ background: '#FFF' }}></span>
                    <span className="voice-equalizer-bar" style={{ background: '#FFF' }}></span>
                    <span className="voice-equalizer-bar" style={{ background: '#FFF' }}></span>
                    <span className="voice-equalizer-bar" style={{ background: '#FFF' }}></span>
                  </div>
                ) : (
                  <Bot size={20} />
                )}
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: '0.96rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Jal-Mitra Indian Voice AI</span>
                  <span style={{
                    background: isListening ? '#D32F2F' : isSpeaking ? '#1B8A5A' : 'rgba(255,255,255,0.2)',
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    color: '#FFF',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}>
                    {isListening ? 'LISTENING 🎙️' : isSpeaking ? 'SPEAKING 🔊' : 'INDIAN VOICE'}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                  Hindi • Indian English • Hinglish RAG
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Stop Speaking Button (Visible when speech is playing) */}
              {isSpeaking && (
                <button
                  onClick={stopAllAudio}
                  style={{
                    background: '#D32F2F',
                    border: 'none',
                    color: '#FFFFFF',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}
                  title="Stop Speaking / आवाज़ रोकें"
                >
                  <Square size={10} fill="#FFF" /> Stop
                </button>
              )}

              {/* Auto Voice Toggle */}
              <button
                onClick={() => {
                  stopAllAudio();
                  setAutoVoiceReply(prev => !prev);
                }}
                style={{
                  background: autoVoiceReply ? 'rgba(27, 138, 90, 0.35)' : 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: autoVoiceReply ? '#A5D6A7' : '#CCC',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
                title="Toggle Automatic AI Voice Response"
              >
                {autoVoiceReply ? <Volume2 size={12} /> : <VolumeX size={12} />}
                <span>{autoVoiceReply ? 'Voice ON' : 'Voice OFF'}</span>
              </button>

              <button
                onClick={() => {
                  stopAllAudio();
                  setIsOpen(false);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#FFFFFF',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Active Listening Audio Wave Banner */}
          {isListening && (
            <div style={{
              background: '#D32F2F',
              color: '#FFFFFF',
              padding: '9px 16px',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'pulse 1.5s infinite'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mic size={16} />
                <span>बोलिए, मैं सुन रहा हूँ... (Listening in Hindi/English...)</span>
              </div>
              <button
                onClick={toggleListening}
                style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#FFF', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Error Banner for Mic/Audio issues */}
          {voiceError && (
            <div style={{
              background: '#FFF3CD',
              color: '#856404',
              padding: '8px 14px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: '1px solid #FFEEBA'
            }}>
              <AlertTriangle size={14} color="#856404" />
              <span>{voiceError}</span>
            </div>
          )}

          {/* Messages Feed Area */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            background: '#F8F8FC',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {messages.map((m) => (
              <div
                key={m.id || m.timestamp}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{
                  padding: '12px 16px',
                  borderRadius: m.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  background: m.sender === 'user' ? 'var(--primary)' : '#FFFFFF',
                  color: m.sender === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  border: m.sender === 'user' ? 'none' : '1px solid var(--border)',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-line'
                }}>
                  {m.text}

                  {/* Embedded Live Telemetry Card if available */}
                  {m.unitData && (
                    <div style={{
                      marginTop: '10px',
                      background: m.isSafe ? '#E8F5E9' : '#FFEBEE',
                      border: `1px solid ${m.isSafe ? '#A5D6A7' : '#EF9A9A'}`,
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#150202',
                      fontSize: '0.78rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <strong style={{ color: 'var(--primary)' }}>{m.unitData.name}</strong>
                        <span style={{
                          background: m.isSafe ? '#1B8A5A' : '#D32F2F',
                          color: '#FFF',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '0.7rem'
                        }}>
                          {m.isSafe ? '✓ SAFE' : '✗ UNSAFE'}
                        </span>
                      </div>
                      <div>• TDS: <strong>{m.unitData.tds} ppm</strong> | pH: <strong>{m.unitData.ph}</strong> | Turb: <strong>{m.unitData.turbidity} NTU</strong></div>
                      
                      <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px dashed rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Caretaker: <strong>{m.unitData.contact}</strong></span>
                        <a
                          href={`tel:${m.unitData.phone}`}
                          style={{
                            background: 'var(--primary)',
                            color: '#FFF',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <PhoneCall size={10} /> Call
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Advice Box */}
                  {m.advice && (
                    <div style={{
                      marginTop: '8px',
                      background: 'var(--primary-subtle)',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      borderLeft: '3px solid var(--primary)'
                    }}>
                      💡 {m.advice}
                    </div>
                  )}

                  {/* Verified Data Source Citation (Hindi / English) */}
                  {m.source && (
                    <div style={{
                      marginTop: '8px',
                      padding: '5px 9px',
                      background: 'rgba(41, 19, 108, 0.05)',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      border: '1px solid rgba(41, 19, 108, 0.12)'
                    }}>
                      <ShieldCheck size={13} color="var(--primary)" />
                      <span>
                        <strong style={{ color: 'var(--primary)' }}>
                          {lang === 'hi' ? 'डेटा स्रोत:' : 'Data Source:'}
                        </strong> {m.source}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer time & Replay Indian Voice Button */}
                <div style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  padding: '0 4px'
                }}>
                  <span>{m.timestamp}</span>

                  {m.sender === 'bot' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {/* Replay Button */}
                      <button
                        onClick={() => {
                          if (activeSpeakingMsgId === m.id && isSpeaking) {
                            stopAllAudio();
                          } else {
                            playIndianVoice(m.tts || { text: m.spokenSummary || m.text }, m.id);
                          }
                        }}
                        style={{
                          background: activeSpeakingMsgId === m.id && isSpeaking ? '#E8F5E9' : 'transparent',
                          border: activeSpeakingMsgId === m.id && isSpeaking ? '1px solid #1B8A5A' : 'none',
                          color: activeSpeakingMsgId === m.id && isSpeaking ? '#1B8A5A' : 'var(--primary)',
                          borderRadius: '10px',
                          padding: '1px 6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          fontWeight: 700
                        }}
                        title={activeSpeakingMsgId === m.id && isSpeaking ? 'Stop voice playback' : 'Play Indian Voice reply'}
                      >
                        {activeSpeakingMsgId === m.id && isSpeaking ? (
                          <>
                            <Square size={10} fill="#1B8A5A" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={12} />
                            <span>{lang === 'en' ? 'Play Voice' : 'आवाज़ में सुनें'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start', background: '#FFFFFF', padding: '10px 16px', borderRadius: '16px', border: '1px solid var(--border)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)' }}>
                <RefreshCw size={14} className="animate-spin" />
                <span>Checking sensor telemetry from database...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips Bar */}
          <div style={{
            background: '#FFFFFF',
            borderTop: '1px solid var(--border)',
            padding: '8px 12px',
            overflowX: 'auto',
            display: 'flex',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}>
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuery(lang === 'hi' ? q.hi : q.en)}
                style={{
                  background: 'var(--primary-subtle)',
                  border: '1px solid rgba(41, 19, 108, 0.15)',
                  color: 'var(--primary)',
                  padding: '4px 10px',
                  borderRadius: '14px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                ✨ {lang === 'hi' ? q.hi : q.en}
              </button>
            ))}
          </div>

          {/* Input Box Area with Pulsing Microphone & Send */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            style={{
              padding: '10px 14px',
              background: '#FFFFFF',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            {/* 🎙️ Natural Indian Voice Input Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={isListening ? 'voice-mic-pulsing' : ''}
              style={{
                background: isListening ? '#D32F2F' : 'var(--primary-subtle)',
                color: isListening ? '#FFFFFF' : 'var(--primary)',
                border: `2px solid ${isListening ? '#D32F2F' : 'var(--primary)'}`,
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: isListening ? '0 0 14px rgba(211, 47, 47, 0.7)' : 'none',
                transition: 'all 0.2s'
              }}
              title={isListening ? 'Listening... click to stop' : 'Click to speak in Hindi/English/Hinglish (माइक से बोलें)'}
            >
              <Mic size={18} className={isListening ? 'animate-pulse' : ''} />
            </button>

            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={isListening ? (lang === 'hi' ? 'बोलिए (हिंदी / इंग्लिश)...' : 'Listening (Hindi/English/Hinglish)...') : (lang === 'hi' ? 'माइक दबाकर बोलें या लिखें...' : 'Speak via mic or type question...')}
              style={{
                flex: 1,
                padding: '9px 12px',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />

            <button
              type="submit"
              disabled={!inputQuery.trim() || loading}
              style={{
                background: 'var(--primary)',
                color: '#FFFFFF',
                border: 'none',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputQuery.trim() ? 'pointer' : 'default',
                opacity: inputQuery.trim() ? 1 : 0.5,
                transition: 'all 0.2s',
                flexShrink: 0
              }}
            >
              <Send size={15} />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
