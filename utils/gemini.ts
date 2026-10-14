import * as Network from 'expo-network';

export class OfflineError extends Error {
  constructor(
    message = 'Generating quiz questions and flashcards requires an active internet connection. Please connect to Wi-Fi or mobile data and try again.'
  ) {
    super(message);
    this.name = 'OfflineError';
  }
}

export class GeminiApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GeminiApiError';
    this.status = status;
  }
}

/**
 * Returns a human-friendly title and message for AI errors, differentiating offline vs API errors.
 */
export function getFriendlyAiErrorMessage(
  error: unknown,
  fallbackMessage = 'Could not complete AI generation.'
): { title: string; message: string; isOffline: boolean } {
  if (error instanceof OfflineError) {
    return {
      title: 'No Internet Connection',
      message: error.message,
      isOffline: true,
    };
  }

  const rawMessage = error instanceof Error ? error.message : String(error);
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('network request failed') ||
    lower.includes('offline') ||
    lower.includes('internet') ||
    lower.includes('failed to fetch') ||
    lower.includes('econnrefused') ||
    lower.includes('timed out') ||
    lower.includes('networkerror')
  ) {
    return {
      title: 'No Internet Connection',
      message:
        'Generating quiz questions and flashcards with AI requires an active internet connection. Please connect to Wi-Fi or mobile data and try again.',
      isOffline: true,
    };
  }

  if (lower.includes('api key is not configured') || lower.includes('gemini api key')) {
    return {
      title: 'AI Setup Required',
      message: 'Gemini API key is not configured. Please ensure EXPO_PUBLIC_GEMINI_API_KEY is defined in your .env file.',
      isOffline: false,
    };
  }

  if (lower.includes('authorization') || lower.includes('api key') || lower.includes('403') || lower.includes('400')) {
    return {
      title: 'AI Authorization Failed',
      message: 'The Gemini API key appears invalid or expired. Please verify your Gemini API key.',
      isOffline: false,
    };
  }

  if (lower.includes('rate limit') || lower.includes('quota') || lower.includes('429')) {
    return {
      title: 'Rate Limit Reached',
      message: 'Gemini AI service rate limit reached. Please wait a minute and try again.',
      isOffline: false,
    };
  }

  if (lower.includes('500') || lower.includes('503') || lower.includes('server')) {
    return {
      title: 'Service Temporarily Unavailable',
      message: 'Google Gemini AI servers are currently busy or temporarily down. Please try again in a few moments.',
      isOffline: false,
    };
  }

  return {
    title: 'Generation Error',
    message: rawMessage || fallbackMessage,
    isOffline: false,
  };
}

async function checkInternetConnection(): Promise<void> {
  try {
    const netState = await Network.getNetworkStateAsync();
    if (netState.isConnected === false || netState.isInternetReachable === false) {
      throw new OfflineError(
        'You are currently offline. Generating quizzes and flashcards with AI requires an active internet connection.'
      );
    }
  } catch (err) {
    if (err instanceof OfflineError) {
      throw err;
    }
    // If checking network state itself throws an unexpected error, continue to fetch
  }
}

export type ExtractedFlashcard = {
  question: string;
  answer: string;
};

export type GeneratedQuizQuestion = {
  question: string;
  options: [string, string, string, string];
  correct_answer_index: number; // 0 to 3
};

export type QuizGenerationOptions = {
  questionCount: number;
  questionType: 'Multiple Choice' | 'True / False' | 'Identification';
  difficulty: 'Easy' | 'Medium' | 'Hard';
};

function getGeminiApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!key || !key.trim()) return null;
  return key.trim();
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';

async function callGemini(prompt: string): Promise<string> {
  await checkInternetConnection();

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please check EXPO_PUBLIC_GEMINI_API_KEY in your .env file.');
  }

  const endpoint = `${GEMINI_API_URL}?key=${apiKey}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });
  } catch (fetchErr) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    if (
      msg.includes('Network request failed') ||
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('Aborted')
    ) {
      throw new OfflineError(
        'Could not reach Google Gemini. Please check your internet connection and try again.'
      );
    }
    throw new Error(`Connection error: ${msg}`);
  }

  if (!response.ok) {
    let friendlyMessage = `AI generation service error (${response.status}).`;
    if (response.status === 400 || response.status === 403) {
      friendlyMessage = 'AI authorization failed. Please check that your Gemini API key is valid and has Generative Language API enabled.';
    } else if (response.status === 429) {
      friendlyMessage = 'Gemini AI rate limit or quota exceeded. Please wait a moment before trying again.';
    } else if (response.status >= 500) {
      friendlyMessage = 'Google Gemini servers are currently experiencing high traffic or temporary downtime. Please try again shortly.';
    }
    throw new GeminiApiError(friendlyMessage, response.status);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error('No content returned from Gemini.');
  }

  return textResponse;
}

/**
 * Generates flashcard question/answer pairs from study material text.
 */
export async function extractFlashcardsWithGemini(
  content: string,
  count: number
): Promise<ExtractedFlashcard[]> {
  if (!content.trim()) {
    throw new Error('No study material content provided for extraction.');
  }

  const prompt = `You are an academic flashcard generator for students.
Extract exactly ${count} high-yield flashcard study pairs from the following study materials.

Guidelines:
- Each card should focus on a key concept, term, definition, or formula.
- Question/term should be clear and concise.
- Answer/definition should be accurate and direct.
- Return ONLY a valid JSON array of objects with the exact keys "question" and "answer".

Study Material:
"""
${content.slice(0, 25000)}
"""

JSON Format:
[
  { "question": "What is ...?", "answer": "..." }
]`;

  const jsonText = await callGemini(prompt);
  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid JSON format received from Gemini.');
    }
    return parsed.map((item: any) => ({
      question: String(item.question || '').trim(),
      answer: String(item.answer || '').trim(),
    })).filter(c => c.question && c.answer);
  } catch (err: any) {
    throw new Error(`Failed to parse generated flashcards: ${err.message}`);
  }
}

/**
 * Generates a quiz from study material text based on question count, type, and difficulty.
 */
export async function generateQuizWithGemini(
  content: string,
  options: QuizGenerationOptions
): Promise<GeneratedQuizQuestion[]> {
  if (!content.trim()) {
    throw new Error('No study material content provided for quiz generation.');
  }

  const prompt = `You are an academic exam quiz generator.
Create a quiz with exactly ${options.questionCount} questions based on the following study materials.

Parameters:
- Question Type: ${options.questionType}
- Difficulty Level: ${options.difficulty}

Formatting Rules:
- Return ONLY a valid JSON array of question objects.
- Each object must have:
  - "question": string
  - "options": an array of 4 distinct string choices [choiceA, choiceB, choiceC, choiceD].
    ${options.questionType === 'True / False' ? '- For True / False, options must be ["True", "False", "Partially True", "Cannot be determined"] with "True" or "False" as the correct answer.' : ''}
    ${options.questionType === 'Identification' ? '- For Identification, provide 1 correct term and 3 plausible related distractors in options.' : ''}
  - "correct_answer_index": integer from 0 to 3 pointing to the index in options that is correct.

Study Material:
"""
${content.slice(0, 25000)}
"""

JSON Format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer_index": 0
  }
]`;

  const jsonText = await callGemini(prompt);
  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid JSON format received from Gemini.');
    }
    return parsed.map((item: any) => {
      const opts = Array.isArray(item.options) ? item.options.map(String) : [];
      while (opts.length < 4) opts.push(`Option ${opts.length + 1}`);
      const correctIdx = typeof item.correct_answer_index === 'number' && item.correct_answer_index >= 0 && item.correct_answer_index < 4
        ? item.correct_answer_index
        : 0;

      return {
        question: String(item.question || '').trim(),
        options: [opts[0], opts[1], opts[2], opts[3]] as [string, string, string, string],
        correct_answer_index: correctIdx,
      };
    }).filter(q => q.question.length > 0);
  } catch (err: any) {
    throw new Error(`Failed to parse generated quiz: ${err.message}`);
  }
}

/**
 * Extracts and cleans study notes from a document file using Gemini.
 * Supports inline base64 for PDF or raw text.
 */
export async function extractDocumentNotesWithGemini(
  base64Data: string,
  mimeType: string
): Promise<string> {
  await checkInternetConnection();

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please check EXPO_PUBLIC_GEMINI_API_KEY in your .env file.');
  }

  const endpoint = `${GEMINI_API_URL}?key=${apiKey}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType || 'application/pdf',
                },
              },
              {
                text: 'Please extract the key academic study content and comprehensive notes from this document. Provide clear, structured study notes formatted for student review, including main topics, definitions, concepts, and key details. Do not output conversational preamble.',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      }),
    });
  } catch (fetchErr) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    if (
      msg.includes('Network request failed') ||
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('Aborted')
    ) {
      throw new OfflineError(
        'Could not reach Google Gemini. Please check your internet connection and try again.'
      );
    }
    throw new Error(`Connection error: ${msg}`);
  }

  if (!response.ok) {
    let friendlyMessage = `AI document processing error (${response.status}).`;
    if (response.status === 400 || response.status === 403) {
      friendlyMessage = 'AI authorization failed. Please check that your Gemini API key is valid.';
    } else if (response.status === 429) {
      friendlyMessage = 'Gemini AI rate limit exceeded. Please wait a moment before trying again.';
    } else if (response.status >= 500) {
      friendlyMessage = 'Google Gemini servers are temporarily unavailable. Please try again shortly.';
    }
    throw new GeminiApiError(friendlyMessage, response.status);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error('Gemini could not extract text from this document.');
  }

  return textResponse.trim();
}
