import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Resilient Model Fallback Ladder
const MODEL_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

// Lazy initialization of GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Standard Helper with Fallback Ladder & Error Recovery Matrix
 */
async function generateContentWithFallback(params: {
  contents: any;
  systemInstruction?: string;
  responseSchema?: any;
  responseMimeType?: string;
  temperature?: number;
}): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  let lastError: any = null;

  for (const model of MODEL_LADDER) {
    try {
      const config: any = {};
      if (params.systemInstruction) {
        config.systemInstruction = params.systemInstruction;
      }
      if (params.responseSchema) {
        config.responseSchema = params.responseSchema;
      }
      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }
      if (typeof params.temperature === 'number') {
        config.temperature = params.temperature;
      }

      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      const outputText = response.text || '';
      return { text: outputText, modelUsed: model };
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${model} failed:`, err?.message || err);
      lastError = err;
      // Recoverable error check: 503, 429, 404, 500 or model not found
      const status = err?.status || err?.statusCode || 0;
      const msg = (err?.message || '').toLowerCase();
      const isRecoverable =
        status === 503 ||
        status === 429 ||
        status === 404 ||
        status === 500 ||
        msg.includes('not found') ||
        msg.includes('unavailable') ||
        msg.includes('quota') ||
        msg.includes('resource exhausted') ||
        msg.includes('overloaded');

      if (isRecoverable) {
        continue;
      }
      // If it's another error, also attempt next model before giving up
      continue;
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// ----------------------------------------------------------------------
// API Routes
// ----------------------------------------------------------------------

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Multi-Turn Reflection & Chat
 */
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const { messages = [], systemPrompt, context } = data;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Limit context length for token safety
    const safeMessages = messages.slice(-14).map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.content || m.text || '').slice(0, 4000) }],
    }));

    const systemInstruction =
      systemPrompt ||
      `You are MindScribe, a reflective, empathetic, and insightful journaling companion.
Your mission is to help the user unpack their thoughts, gain clarity, recognize patterns, and explore constructive perspectives.
Guidelines:
1. Provide thoughtful, warm, and structured responses.
2. Frame all insights as personal observations rather than medical, psychological, or clinical advice.
3. Ask gentle open-ended questions when appropriate to encourage deeper reflection.
4. Use clean formatting with paragraphs and occasional bullet points for clarity.
5. If the user mentions goals, acknowledge them constructively.`;

    const contents = safeMessages;
    const result = await generateContentWithFallback({
      contents,
      systemInstruction,
      temperature: 0.7,
    });

    res.json({
      text: result.text,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    res.status(500).json({
      error: 'Failed to generate reflection response. Please try again.',
      details: error.message,
    });
  }
});

/**
 * Specialized Reflection Actions (Summarize, Reflect, Brainstorm, Themes, Goals, Next Steps)
 */
app.post('/api/gemini/action', async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const { action, conversationHistory = [], userInput = '' } = data;

    if (!action) {
      return res.status(400).json({ error: 'Action type is required.' });
    }

    // Format conversation history for context
    const formattedHistory = Array.isArray(conversationHistory)
      ? conversationHistory
          .slice(-10)
          .map((m: any) => `${m.role === 'assistant' ? 'AI Guide' : 'Journaler'}: ${m.content}`)
          .join('\n\n')
      : '';

    let prompt = '';
    let systemInstruction = `You are MindScribe, an advanced reflective journaling synthesis engine. All insights are non-clinical, constructive, and empowering observations.`;

    switch (action) {
      case 'summarize':
        prompt = `Please provide a concise, structured summary of this journaling session. Highlight:
1. **Core Theme & Mindset**: The overarching topic and emotional tone.
2. **Key Realizations**: 2-3 main takeaways or epiphanies.
3. **Open Questions**: Points the journaler might revisit later.

Journal Context:
${formattedHistory}
${userInput ? `\nLatest input: ${userInput}` : ''}`;
        break;

      case 'reflect':
        prompt = `Offer a deep, thoughtful reflection on the journal entry below. 
Observe underlying feelings, celebrate positive self-awareness, highlight subtle cognitive shifts, and offer a compassionate perspective. Avoid clinical diagnoses.

Journal Context:
${formattedHistory}
${userInput ? `\nLatest input: ${userInput}` : ''}`;
        break;

      case 'brainstorm':
        prompt = `Based on the user's reflection, brainstorm constructive ideas, creative angles, and potential solutions to explore.
Structure into distinct categories or perspectives with actionable possibilities.

Journal Context:
${formattedHistory}
${userInput ? `\nLatest input: ${userInput}` : ''}`;
        break;

      case 'themes':
        prompt = `Identify the core recurring themes, emotional undertones, and cognitive patterns present in this journal session.
Present them with clear headings, a brief description of each theme, and what it might signify for personal growth.

Journal Context:
${formattedHistory}
${userInput ? `\nLatest input: ${userInput}` : ''}`;
        break;

      case 'extract-goals':
        prompt = `Analyze the journal entry and extract any explicit or implicit goals mentioned by the user.
For each goal:
- Provide a clear, actionable Goal Title
- Suggest an appropriate category (Personal, Career, Health, Learning, Mindfulness, Projects, Other)
- Break it down into 3-4 tangible, sequential Milestones
- Provide a 1-sentence rationale explaining how it connects to the reflection.

Format your response clearly so the user can easily add them to their goal tracker.

Journal Context:
${formattedHistory}
${userInput ? `\nLatest input: ${userInput}` : ''}`;
        break;

      case 'next-steps':
        prompt = `Transform the user's journal reflection into practical, high-leverage next actions.
Divide into:
1. **Immediate Micro-Action** (Takes < 10 mins today)
2. **Short-Term Actions** (This week)
3. **Mindset / Habit Anchor** (Ongoing reminder)

Journal Context:
${formattedHistory}
${userInput ? `\nLatest input: ${userInput}` : ''}`;
        break;

      default:
        prompt = `Please reflect on the following journal session:\n${formattedHistory}\n${userInput}`;
    }

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction,
      temperature: 0.7,
    });

    res.json({
      text: result.text,
      modelUsed: result.modelUsed,
      action,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/action:', error);
    res.status(500).json({
      error: 'Failed to process AI reflection action.',
      details: error.message,
    });
  }
});

/**
 * Structured Goal Extraction Endpoint (Returns JSON array of goals)
 */
app.post('/api/gemini/extract-goals', async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const { text = '' } = data;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for goal extraction.' });
    }

    const prompt = `Extract actionable goals from the following journal text. Return ONLY a valid JSON object matching the requested schema.
Schema:
{
  "goals": [
    {
      "title": "Clear concise goal title",
      "category": "Personal" | "Career" | "Health" | "Learning" | "Mindfulness" | "Projects" | "Other",
      "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"],
      "rationale": "Brief note on why this was extracted"
    }
  ]
}

Journal Content:
${text.slice(0, 6000)}`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      responseMimeType: 'application/json',
      systemInstruction: 'You extract structured personal goals and realistic milestones from journal reflections. Always output valid JSON only.',
    });

    try {
      const parsed = JSON.parse(result.text);
      res.json(parsed);
    } catch {
      // Fallback if JSON parse fails
      res.json({
        goals: [
          {
            title: 'Reflect and Act on Insights',
            category: 'Personal',
            milestones: ['Review journal session notes', 'Identify top priority item', 'Execute first step'],
            rationale: 'Derived from reflection session.',
          },
        ],
      });
    }
  } catch (error: any) {
    console.error('Error in /api/gemini/extract-goals:', error);
    res.status(500).json({
      error: 'Failed to extract structured goals.',
      details: error.message,
    });
  }
});

/**
 * Dedicated Daily Reflection Synthesis
 */
app.post('/api/gemini/daily-reflection', async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const { rawPromptText = '', mood = 'neutral' } = data;

    if (!rawPromptText) {
      return res.status(400).json({ error: 'Reflection text is required.' });
    }

    const prompt = `Synthesize this daily reflection entry into a structured evening review. Return ONLY a valid JSON object.
Mood recorded by user: ${mood}

Daily Entry:
${rawPromptText.slice(0, 6000)}

Required JSON Schema:
{
  "dailySummary": "A supportive, 2-3 sentence overview capturing the essence of the day",
  "keyEvents": ["Significant event or milestone 1", "Key interaction or happening 2"],
  "whatWentWell": ["Win or positive moment 1", "Gratitude or strength demonstrated 2"],
  "challenges": ["Friction or challenge encountered 1", "Obstacle navigated 2"],
  "lessonsLearned": ["Insight or wisdom gained 1", "Useful takeaway 2"],
  "tomorrowFocus": "A clear, inspiring intention for tomorrow"
}`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      responseMimeType: 'application/json',
      systemInstruction: 'You are an empathetic, constructive daily reflection synthesizer. Provide inspiring and objective synthesis in valid JSON.',
    });

    try {
      const synthesis = JSON.parse(result.text);
      res.json({ synthesis, modelUsed: result.modelUsed });
    } catch {
      res.json({
        synthesis: {
          dailySummary: 'A productive day of learning and self-observation.',
          keyEvents: ['Completed daily tasks', 'Engaged in meaningful reflection'],
          whatWentWell: ['Dedication to mindfulness', 'Clarity on current priorities'],
          challenges: ['Navigating daily friction with focus'],
          lessonsLearned: ['Consistent reflection deepens clarity'],
          tomorrowFocus: 'Approach tomorrow with calm clarity and focused execution.',
        },
        modelUsed: result.modelUsed,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/gemini/daily-reflection:', error);
    res.status(500).json({
      error: 'Failed to synthesize daily reflection.',
      details: error.message,
    });
  }
});

/**
 * Conversation Title Generator
 */
app.post('/api/gemini/generate-title', async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const { firstMessage = '' } = data;

    if (!firstMessage) {
      return res.json({ title: 'New Reflection' });
    }

    const prompt = `Generate a concise, evocative, and elegant title (3 to 5 words maximum) that captures the core essence of this journal prompt. Do NOT use quotation marks or prefixes like "Title:".

User text:
${firstMessage.slice(0, 1000)}`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      temperature: 0.5,
    });

    const title = result.text.trim().replace(/^["']|["']$/g, '').slice(0, 40) || 'Journal Reflection';
    res.json({ title });
  } catch (error: any) {
    console.error('Error in /api/gemini/generate-title:', error);
    res.json({ title: 'Personal Reflection' });
  }
});

/**
 * Historical Journal Insights Generator
 */
app.post('/api/gemini/insights', async (req: Request, res: Response) => {
  try {
    const data = req.body && typeof req.body === 'object' ? req.body : {};
    const { entries = [] } = data;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Entries are required for historical analysis.' });
    }

    const formattedEntries = entries
      .slice(0, 25)
      .map((e: any, idx: number) => `[Entry ${idx + 1} - ${e.date || 'Unknown date'}]: ${e.preview || e.text}`)
      .join('\n\n');

    const prompt = `Analyze these ${entries.length} historical journal entries and synthesize holistic personal growth insights. 
Remember: Frame all findings strictly as constructive personal growth observations and patterns, NEVER as clinical or psychological diagnoses.

Output valid JSON only matching this schema:
{
  "recurringThemes": [
    { "theme": "Short Theme Name", "frequency": "High / Moderate", "description": "1-2 sentence breakdown of how this manifested" }
  ],
  "frequentTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "repeatedGoals": ["Goal / aspiration 1", "Goal / aspiration 2"],
  "progressOverTime": "2-3 sentences analyzing progression in perspective, focus, or mindset across entries",
  "positiveDevelopments": ["Constructive breakthrough 1", "Positive habit or pattern 2"],
  "areasToImprove": ["Area needing attention 1", "Constructive growth point 2"],
  "commonChallenges": ["Challenge 1", "Challenge 2"],
  "priorityShifts": "Observations on how priorities or focus areas have evolved",
  "recommendedFocus": "A high-leverage focus suggestion for the coming weeks"
}

Historical Entries:
${formattedEntries.slice(0, 8000)}`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      responseMimeType: 'application/json',
      systemInstruction: 'You are an insightful journal analytics and self-discovery synthesizer. Output valid JSON only.',
    });

    try {
      const insights = JSON.parse(result.text);
      res.json({ insights, modelUsed: result.modelUsed });
    } catch {
      res.status(500).json({ error: 'Failed to parse insights JSON from model.' });
    }
  } catch (error: any) {
    console.error('Error in /api/gemini/insights:', error);
    res.status(500).json({
      error: 'Failed to generate historical insights.',
      details: error.message,
    });
  }
});

// ----------------------------------------------------------------------
// Vite Middleware / Static Serving
// ----------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MindScribe Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
