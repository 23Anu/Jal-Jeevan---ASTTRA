const express = require('express');
const router = express.Router();
const { processWaterRagQuery } = require('../services/ragService');
const { synthesizeIndianSpeech, cleanTextForSpeech } = require('../services/ttsService');

// POST /api/ai/query - Process natural language RAG water query
router.post('/query', async (req, res) => {
  try {
    const { query, lang = 'en' } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'Query string is required' });
    }

    const result = await processWaterRagQuery(query, lang);
    res.json(result);
  } catch (error) {
    console.error('Error processing AI RAG query:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/tts - Synthesize Natural Indian Voice
router.post('/tts', async (req, res) => {
  try {
    const { text, lang = 'en' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Text string is required for speech synthesis' });
    }

    const ttsResult = await synthesizeIndianSpeech(text, lang);
    res.json(ttsResult);
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/voice-query - Combined RAG query + Natural Indian Voice generation in 1 fast roundtrip
router.post('/voice-query', async (req, res) => {
  try {
    const { query, lang = 'en' } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'Query string is required' });
    }

    // 1. Process RAG query
    const ragResult = await processWaterRagQuery(query, lang);

    // 2. Prepare spoken summary text
    let spokenSummary = '';
    if (ragResult.unitData) {
      if (ragResult.isSafe) {
        spokenSummary = (lang === 'hi' || /[अ-ह]/.test(query))
          ? `खुशखबरी! ${ragResult.unitData.name}, ${ragResult.unitData.district} का पानी पीने के लिए बिल्कुल शुद्ध और सुरक्षित है। TDS स्तर ${ragResult.unitData.tds} मिलीग्राम प्रति लीटर और pH मान ${ragResult.unitData.ph} है।`
          : `Good news! Water from ${ragResult.unitData.name} in ${ragResult.unitData.district} is 100 percent pure and safe to drink. TDS is ${ragResult.unitData.tds} ppm and pH is ${ragResult.unitData.ph}.`;
      } else {
        spokenSummary = (lang === 'hi' || /[अ-ह]/.test(query))
          ? `सावधान! ${ragResult.unitData.name} का पानी अभी अशुद्ध है। TDS स्तर ${ragResult.unitData.tds} है और स्वचालित सोलेनोइड वाल्व पानी को शुद्ध करने के लिए पुनर्चक्रित कर रहा है।`
          : `Caution! Water from ${ragResult.unitData.name} is currently unsafe. TDS is ${ragResult.unitData.tds} ppm. The automated solenoid valve is recirculating water for filtration.`;
      }
    } else {
      spokenSummary = ragResult.answer;
    }

    // 3. Synthesize Indian Voice
    const ttsResult = await synthesizeIndianSpeech(spokenSummary, lang);

    res.json({
      ...ragResult,
      tts: ttsResult,
      spokenSummary
    });
  } catch (error) {
    console.error('Error processing combined voice query:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/ai/quick-questions - Starter query suggestions
router.get('/quick-questions', (req, res) => {
  res.json({
    success: true,
    questions: [
      {
        en: 'Is Kanke Ranchi water safe right now?',
        hi: 'क्या कांके राँची का पानी पीने लायक है?'
      },
      {
        en: 'How is the water quality in Jharia Dhanbad?',
        hi: 'झरिया धनबाद का पानी कैसा है?'
      },
      {
        en: 'Check Sukhurhutu Hand Pump station',
        hi: 'सुखुरहुटू जल केंद्र का हाल बताओ'
      },
      {
        en: 'Which stations are currently safe to drink?',
        hi: 'झारखण्ड में चालू सुरक्षित नल कहाँ हैं?'
      },
      {
        en: 'What is the safe TDS drinking limit?',
        hi: 'पीने के पानी में सुरक्षित TDS कितना होना चाहिए?'
      }
    ]
  });
});

module.exports = router;
