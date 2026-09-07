const keys = require('../config/keys');

/**
 * Clean text for natural speech synthesis
 */
function cleanTextForSpeech(rawText) {
  if (!rawText) return '';
  return rawText
    .replace(/[*#_`~]/g, '')             // remove markdown formatting
    .replace(/[📍🟢🔴⚪⚠️📊•✨💡]/g, '') // remove symbols and emojis
    .replace(/\s+/g, ' ')               // collapse extra spaces
    .trim();
}

/**
 * Synthesize Indian Natural Voice Speech
 * Supports Hindi (hi-IN), Indian English (en-IN), and Hinglish.
 */
async function synthesizeIndianSpeech(text, lang = 'en') {
  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) {
    throw new Error('No text provided for speech synthesis');
  }

  // Detect whether to use Hindi or Indian English voice
  const isHindi = lang === 'hi' || lang === 'kht' || lang === 'nag' || lang === 'mun' || lang === 'sat' || /[अ-ह]/.test(cleanText);
  const languageCode = isHindi ? 'hi-IN' : 'en-IN';
  const voiceName = isHindi ? (keys.TTS.VOICE_HINDI || 'hi-IN-Neural2-A') : (keys.TTS.VOICE_ENGLISH || 'en-IN-Neural2-B');

  const apiKey = keys.TTS.GOOGLE_API_KEY;

  // 1. Google Cloud Text-to-Speech API (Neural2 / WaveNet Indian Voices)
  if (apiKey) {
    try {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: { text: cleanText },
          voice: {
            languageCode,
            name: voiceName,
            ssmlGender: 'FEMALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0.0
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioContent) {
          return {
            success: true,
            provider: 'GOOGLE_CLOUD_NEURAL2_INDIAN_TTS',
            audioBase64: data.audioContent,
            mimeType: 'audio/mp3',
            languageCode,
            voiceName,
            cleanedText: cleanText
          };
        }
      } else {
        const errText = await response.text();
        console.warn('Google TTS API returned error:', errText);
      }
    } catch (err) {
      console.warn('Google TTS network request failed:', err.message);
    }
  }

  // 2. Graceful Fallback for Fast Local Speech Synthesis
  return {
    success: true,
    provider: 'BROWSER_NATIVE_INDIAN_VOICE_ENGINE',
    fallbackToBrowser: true,
    languageCode,
    voiceName: isHindi ? 'hi-IN (Google हिन्दी / Swara)' : 'en-IN (Google Indian English / Neerja)',
    cleanedText: cleanText
  };
}

module.exports = {
  synthesizeIndianSpeech,
  cleanTextForSpeech
};
