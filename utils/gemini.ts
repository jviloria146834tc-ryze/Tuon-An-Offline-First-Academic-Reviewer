/**
 * Google Gemini API Client for Tuon Reviewer.
 * Uses direct fetch to the Gemini REST API for maximum compatibility with React Native/Expo.
 */

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
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please check EXPO_PUBLIC_GEMINI_API_KEY in your .env file.');
  }

  const endpoint = `${GEMINI_API_URL}?key=${apiKey}`;

  const response = await fetch(endpoint, {
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

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody || response.statusText}`);
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
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please check EXPO_PUBLIC_GEMINI_API_KEY in your .env file.');
  }

  const endpoint = `${GEMINI_API_URL}?key=${apiKey}`;

  const response = await fetch(endpoint, {
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

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini document processing error (${response.status}): ${errorBody || response.statusText}`);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error('Gemini could not extract text from this document.');
  }

  return textResponse.trim();
}
