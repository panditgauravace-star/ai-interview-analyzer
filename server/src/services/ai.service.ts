import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';

if (!config.gemini.apiKey) {
  console.error('⚠️ WARNING: GEMINI_API_KEY is not set. AI features will not work.');
}

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// ── Retry wrapper — NO mock fallback, real errors only ──
const callAIWithRetry = async (prompt: string, maxRetries = 3): Promise<string> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AI] Attempt ${attempt}/${maxRetries} - Calling Gemini API...`);
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini API');
      }
      console.log(`[AI] Success on attempt ${attempt}`);
      return text;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[AI] Attempt ${attempt} failed:`, errMsg);

      if (attempt === maxRetries) {
        throw new Error(`AI service failed after ${maxRetries} attempts: ${errMsg}`);
      }
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`[AI] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('AI service failed unexpectedly');
};

// ── Safe JSON parser ──
const parseAIJson = (text: string): unknown => {
  try {
    let cleaned = text
      .replace(/^\uFEFF/, '')
      .replace(/```(?:json|JSON)?\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
    return JSON.parse(cleaned);
  } catch (firstError) {
    const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
    if (jsonMatch) {
      try {
        const extracted = jsonMatch[0].replace(/,\s*([\]}])/g, '$1');
        return JSON.parse(extracted);
      } catch { /* ignore */ }
    }
    console.error('AI JSON parse error:', firstError);
    console.error('Raw AI text:', text.substring(0, 500));
    throw new Error('Failed to parse AI response');
  }
};

// ══════════════════════════════════════════════════════════
//  INTRODUCTION ANALYSIS — strict scoring
// ══════════════════════════════════════════════════════════
export const analyzeIntroduction = async (
  transcript: string,
  stream: string
): Promise<unknown> => {
  const wordCount = transcript.trim().split(/\s+/).filter(w => w.length > 0).length;

  // Pre-check: very short or meaningless intro = low score, no AI needed
  if (wordCount < 10) {
    console.log(`[AI] Introduction too short (${wordCount} words), assigning low score`);
    return {
      scores: {
        confidence: 1, communication: 1, fluency: 1,
        clarity: 1, relevance: 0, overall: 1,
      },
      summary: 'Introduction was too short to evaluate meaningfully.',
      strengths: [],
      improvements: [
        'Provide a proper introduction with at least 3-4 sentences',
        'Mention your background, skills, and interests relevant to the role',
      ],
      overallScore: 1,
    };
  }

  // Heuristic floor based on word count
  const maxPossibleFromLength = Math.min(10, Math.floor(wordCount / 10));

  try {
    const prompt = `Analyze this candidate introduction for a ${stream} interview position.
IMPORTANT: Be STRICT in scoring. Short, vague, or irrelevant introductions must score LOW.
A one-line introduction like "Hi I am X" should score 1-2 out of 10.
Only give 7+ scores for genuinely detailed, relevant, articulate introductions.

Transcript: "${transcript}"
Word count: ${wordCount}

Evaluate (0-10 each, be strict):
1. Confidence 2. Communication 3. Fluency 4. Clarity 5. Relevance to ${stream} role 6. Overall

Return as JSON:
{
  "scores": { "confidence": 0, "communication": 0, "fluency": 0, "clarity": 0, "relevance": 0, "overall": 0 },
  "summary": "string",
  "strengths": ["string"],
  "improvements": ["string"],
  "overallScore": 0
}
Return ONLY valid JSON.`;

    const text = await callAIWithRetry(prompt);
    const result = text ? (parseAIJson(text) as any) : null;

    if (result && typeof result.overallScore === 'number') {
      // Cap AI score: it can't exceed what the length justifies
      result.overallScore = Math.min(result.overallScore, maxPossibleFromLength);
      if (result.scores) {
        for (const key of Object.keys(result.scores)) {
          result.scores[key] = Math.min(result.scores[key], maxPossibleFromLength);
        }
      }
    }
    return result;
  } catch (error) {
    console.error('[AI] Introduction analysis failed, using heuristic:', error);
    // Heuristic fallback based purely on word count
    const hScore = Math.min(10, Math.max(1, Math.floor(wordCount / 15)));
    return {
      scores: {
        confidence: hScore, communication: hScore, fluency: hScore,
        clarity: hScore, relevance: Math.max(1, hScore - 2), overall: hScore,
      },
      summary: `Introduction evaluated by heuristic (${wordCount} words).`,
      strengths: wordCount > 50 ? ['Provided a detailed introduction'] : [],
      improvements: wordCount < 50 ? ['Provide more detail about your experience'] : [],
      overallScore: hScore,
    };
  }
};

// ══════════════════════════════════════════════════════════
//  CODE EVALUATION — strict, test-case-driven scoring
// ══════════════════════════════════════════════════════════
export const evaluateCode = async (
  code: string,
  language: string,
  problemDescription: string,
  testResults: { passed: number; total: number }
): Promise<unknown> => {
  const trimmedCode = code.trim();

  // Pre-check: empty or boilerplate code = zero score
  if (!trimmedCode || trimmedCode.length < 10 ||
    trimmedCode.includes('// your code here') ||
    trimmedCode.includes('# your code here') ||
    trimmedCode === 'pass') {
    console.log('[AI] Empty/boilerplate code detected, assigning zero score');
    return {
      scores: { codeQuality: 0, logicCorrectness: 0, readability: 0, bestPractices: 0, overall: 0 },
      timeComplexity: 'N/A',
      spaceComplexity: 'N/A',
      feedback: 'No code was submitted or code is just the starter template.',
      suggestions: ['Write a complete solution to the problem'],
    };
  }

  // Pre-check: all tests failed = very low score
  if (testResults.total > 0 && testResults.passed === 0) {
    console.log('[AI] All test cases failed, assigning minimal score');
    return {
      scores: { codeQuality: 1, logicCorrectness: 0, readability: 2, bestPractices: 1, overall: 0 },
      timeComplexity: 'Unknown',
      spaceComplexity: 'Unknown',
      feedback: 'Code was submitted but failed all test cases.',
      suggestions: ['Review the problem requirements', 'Test your solution with the provided examples'],
    };
  }

  // Base score from test results (0-10 scale) — this is the hard floor
  const testScore = testResults.total > 0
    ? Math.round((testResults.passed / testResults.total) * 10)
    : 0;

  try {
    const prompt = `Evaluate this code submission. Be STRICT.
CRITICAL SCORING RULES:
- Test case results: ${testResults.passed}/${testResults.total} passed
- The overall score MUST NOT exceed ${testScore + 1} out of 10 (based on test results)
- If 0 tests passed, overall MUST be 0
- If code is trivial or incomplete, score low

Problem: ${problemDescription}
Language: ${language}

Code:
\`\`\`${language}
${code}
\`\`\`

Return as JSON:
{
  "scores": { "codeQuality": 0, "logicCorrectness": 0, "readability": 0, "bestPractices": 0, "overall": 0 },
  "timeComplexity": "string",
  "spaceComplexity": "string",
  "feedback": "string",
  "suggestions": ["string"]
}
Return ONLY valid JSON.`;

    const text = await callAIWithRetry(prompt);
    const result = text ? (parseAIJson(text) as any) : null;

    if (result?.scores) {
      // Hard cap: overall score cannot exceed test-case-derived score + 1
      result.scores.overall = Math.min(result.scores.overall, testScore + 1);
      result.scores.logicCorrectness = Math.min(result.scores.logicCorrectness, testScore + 1);
    }
    return result;
  } catch (error) {
    console.error('[AI] Code evaluation failed, using test-case score:', error);
    return {
      scores: {
        codeQuality: Math.min(testScore, 5),
        logicCorrectness: testScore,
        readability: Math.min(testScore, 5),
        bestPractices: Math.min(testScore, 5),
        overall: testScore,
      },
      timeComplexity: 'Not analyzed',
      spaceComplexity: 'Not analyzed',
      feedback: `Scored based on test results: ${testResults.passed}/${testResults.total} passed.`,
      suggestions: testScore < 10 ? ['Fix failing test cases'] : [],
    };
  }
};

// ══════════════════════════════════════════════════════════
//  CASE STUDY EVALUATION — for non-technical roles
// ══════════════════════════════════════════════════════════
export const evaluateCaseStudy = async (
  answer: string,
  caseDescription: string,
  stream: string
): Promise<unknown> => {
  const wordCount = answer.trim().split(/\s+/).filter(w => w.length > 0).length;

  if (wordCount < 5) {
    return {
      scores: { analysis: 0, relevance: 0, depth: 0, communication: 0, overall: 0 },
      feedback: 'Response was too short or empty.',
      suggestions: ['Provide a detailed analysis addressing all questions'],
    };
  }

  const maxFromLength = Math.min(10, Math.floor(wordCount / 10));

  try {
    const prompt = `Evaluate this case study response for a ${stream} interview.
Be STRICT. Short or vague answers must score LOW. Only give 7+ for thorough, well-reasoned responses.
Word count: ${wordCount}

Case: ${caseDescription}

Response: "${answer}"

Return as JSON:
{
  "scores": { "analysis": 0, "relevance": 0, "depth": 0, "communication": 0, "overall": 0 },
  "feedback": "string",
  "suggestions": ["string"]
}
Return ONLY valid JSON.`;

    const text = await callAIWithRetry(prompt);
    const result = text ? (parseAIJson(text) as any) : null;
    if (result?.scores) {
      result.scores.overall = Math.min(result.scores.overall, maxFromLength);
    }
    return result;
  } catch (error) {
    console.error('[AI] Case study evaluation failed, using heuristic:', error);
    const hScore = Math.min(10, Math.max(0, Math.floor(wordCount / 20)));
    return {
      scores: { analysis: hScore, relevance: hScore, depth: hScore, communication: hScore, overall: hScore },
      feedback: `Evaluated by heuristic (${wordCount} words).`,
      suggestions: hScore < 5 ? ['Provide more detailed analysis'] : [],
    };
  }
};

// ══════════════════════════════════════════════════════════
//  FINAL REPORT — computed from actual scores, NOT fabricated
// ══════════════════════════════════════════════════════════
export const generateFinalReport = async (
  stream: string,
  introData: Record<string, unknown>,
  aptitudeData: Record<string, unknown>,
  technicalData: Record<string, unknown>,
  introScore: number,
  aptitudeScore: number,
  techScore: number,
  isTechnicalRole: boolean
): Promise<unknown> => {
  // Calculate final score from ACTUAL round scores
  let finalScore: number;
  if (isTechnicalRole) {
    finalScore = Math.round(introScore * 0.2 + aptitudeScore * 0.3 + techScore * 0.5);
  } else {
    finalScore = Math.round(introScore * 0.3 + aptitudeScore * 0.7);
  }

  // Determine recommendation from actual score
  let recommendation: string;
  if (finalScore >= 80) recommendation = 'strong-hire';
  else if (finalScore >= 60) recommendation = 'hire';
  else if (finalScore >= 40) recommendation = 'neutral';
  else recommendation = 'reject';

  const breakdown = {
    introduction: { score: introScore, maxScore: 100, percentage: introScore },
    aptitude: { score: aptitudeScore, maxScore: 100, percentage: aptitudeScore },
    technical: {
      score: isTechnicalRole ? techScore : 0,
      maxScore: isTechnicalRole ? 100 : 0,
      percentage: isTechnicalRole ? techScore : 0,
    },
  };

  // Try to get AI-generated strengths/weaknesses/report, but scores are fixed
  try {
    const prompt = `Generate interview performance analysis.
Position: ${stream}
ACTUAL SCORES (do NOT change these): Introduction=${introScore}/100, Aptitude=${aptitudeScore}/100, Technical=${techScore}/100, Final=${finalScore}/100
Recommendation: ${recommendation}

Round data for context:
Introduction: ${JSON.stringify(introData).substring(0, 500)}
Aptitude: ${JSON.stringify(aptitudeData).substring(0, 500)}
Technical: ${JSON.stringify(technicalData).substring(0, 500)}

Based on the ACTUAL scores above, provide:
1. Top 3 strengths (be specific, based on actual performance)
2. Top 3 weaknesses (be specific, based on actual performance)
3. Ratings 0-10 each: communication, technical, problemSolving, confidence, overall
4. Detailed written analysis (100-200 words)

IMPORTANT: Your ratings must be consistent with the actual scores above.
If final score is below 40, ratings should mostly be below 4.
If final score is 40-60, ratings should be around 4-6.
If final score is 60-80, ratings should be around 6-8.
If final score is 80+, ratings can be 8-10.

Return as JSON:
{
  "strengths": ["string"],
  "weaknesses": ["string"],
  "ratings": { "communication": 0, "technical": 0, "problemSolving": 0, "confidence": 0, "overall": 0 },
  "aiReport": "string"
}
Return ONLY valid JSON.`;

    const text = await callAIWithRetry(prompt);
    const aiResult = text ? (parseAIJson(text) as any) : {};

    return {
      totalScore: finalScore,
      breakdown,
      strengths: aiResult.strengths || [],
      weaknesses: aiResult.weaknesses || [],
      ratings: aiResult.ratings || {
        communication: Math.round(finalScore / 12),
        technical: Math.round(techScore / 12),
        problemSolving: Math.round((aptitudeScore + techScore) / 25),
        confidence: Math.round(introScore / 12),
        overall: Math.round(finalScore / 12),
      },
      recommendation,
      aiReport: aiResult.aiReport || `Candidate scored ${finalScore}/100. Recommendation: ${recommendation}.`,
    };
  } catch (error) {
    console.error('[AI] Final report generation failed, using computed values:', error);
    return {
      totalScore: finalScore,
      breakdown,
      strengths: finalScore >= 60 ? ['Completed all rounds'] : [],
      weaknesses: finalScore < 60 ? ['Needs improvement across multiple areas'] : [],
      ratings: {
        communication: Math.round(introScore / 12),
        technical: Math.round(techScore / 12),
        problemSolving: Math.round((aptitudeScore + techScore) / 25),
        confidence: Math.round(introScore / 12),
        overall: Math.round(finalScore / 12),
      },
      recommendation,
      aiReport: `Candidate scored ${finalScore}/100 for the ${stream} position. Introduction: ${introScore}/100, Aptitude: ${aptitudeScore}/100, Technical: ${techScore}/100. Recommendation: ${recommendation}.`,
    };
  }
};

// ══════════════════════════════════════════════════════════
//  AI GENERATION FUNCTIONS (kept as fallback for when DB is empty)
// ══════════════════════════════════════════════════════════
export const generateAptitudeQuestions = async (
  stream: string,
  count: number = 20
): Promise<unknown> => {
  const prompt = `Generate ${count} multiple choice questions for a ${stream} interview aptitude round.
Include a mix of: Logical reasoning (4), Numerical reasoning (3), Analytical thinking (3), Field-specific MCQs (${count - 10})

For each question provide:
- question text
- 4 options (A, B, C, D)
- correct answer letter
- brief explanation
- difficulty: easy/medium/hard

Return as JSON array:
[{ "question": "string", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": "A", "explanation": "string", "difficulty": "medium" }]
Return ONLY valid JSON.`;

  const text = await callAIWithRetry(prompt);
  return parseAIJson(text);
};

export const generateCodingQuestions = async (
  stream: string,
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<unknown> => {
  const prompt = `Generate a coding problem for a ${stream} interview.
Difficulty: ${difficulty}
${difficulty === 'easy' ? 'Simple array/string manipulation.' : ''}
${difficulty === 'medium' ? 'Medium: data structures, sorting, two-pointer.' : ''}
${difficulty === 'hard' ? 'Hard: dynamic programming, graphs, backtracking.' : ''}

Return as JSON:
{
  "title": "string", "description": "string", "constraints": ["string"],
  "examples": [{ "input": "string", "output": "string", "explanation": "string" }],
  "testCases": [{ "input": "string", "expectedOutput": "string", "isHidden": false }],
  "starterCode": { "javascript": "string", "python": "string" },
  "difficulty": "${difficulty}"
}
Provide at least 3 visible and 3 hidden test cases. Return ONLY valid JSON.`;

  const text = await callAIWithRetry(prompt);
  return parseAIJson(text);
};

export const generateCaseStudyQuestions = async (
  stream: string,
  count: number = 3
): Promise<unknown> => {
  const prompt = `Generate ${count} case study questions for a ${stream} interview.
These should be role-specific scenarios requiring analytical thinking.

Return as JSON array:
[{ "title": "string", "scenario": "string (100-200 words)", "questions": ["string"], "evaluationCriteria": ["string"], "difficulty": "medium" }]
Return ONLY valid JSON.`;

  const text = await callAIWithRetry(prompt);
  return parseAIJson(text);
};
