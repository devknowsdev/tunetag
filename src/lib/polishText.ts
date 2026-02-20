import type { CategoryDef } from '../types';

export class PolishUnavailableError extends Error {
  constructor(public reason: string) {
    super('Polish unavailable: ' + reason);
    this.name = 'PolishUnavailableError';
  }
}

const SYSTEM_PROMPT = `You are a copy editor for music annotation data being used to train AI models.
Your job is to lightly rewrite rough listening notes into clean annotation text.

Apply these rules without exception:
1. Present tense only — never past tense
2. No first person — never I, my, me, we
3. No referential openers — never "In this song", "This track", "The song opens"
4. Specific over vague — "warm lo-fi piano" not "nice piano"
5. Every word earns its place — remove filler and superfluous adjectives
6. Matter-of-fact tone — emotions fine if concrete: "haunting", "triumphant"
7. Use conversational cues: "jazzy chords", "descending melody"
8. Apply Who/What/Where/When when describing performers
9. 1-3 sentences maximum
10. Return ONLY the rewritten text — no explanation, no preamble, no quotes`;

type PolishContext =
  | {
      type: 'timeline';
      sectionType: string;
      timestamp: string;
      prev?: { sectionType: string; narrative: string };
    }
  | { type: 'global'; category: CategoryDef };

export async function polishText(
  roughText: string,
  context: PolishContext
): Promise<string> {
  const apiKey = sessionStorage.getItem('beatpulse_api_key');
  if (!apiKey) throw new PolishUnavailableError('No API key set');

  let userMessage: string;
  if (context.type === 'timeline') {
    const prevLine = context.prev
      ? `Previous section (${context.prev.sectionType}): ${context.prev.narrative}`
      : 'This is the opening section.';
    userMessage = `Annotating: ${context.sectionType} section at ${context.timestamp}.
${prevLine}
Rough notes: ${roughText}`;
  } else {
    userMessage = `Annotating category: ${context.category.excelLabel}
Guidance: ${context.category.guidance}
Rough notes: ${roughText}`;
  }

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
  } catch (err) {
    throw new PolishUnavailableError(
      'Network error — check your connection'
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 401)
      throw new PolishUnavailableError('Invalid API key');
    if (response.status === 429)
      throw new PolishUnavailableError('Rate limited — try again in a moment');
    throw new PolishUnavailableError(`API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text =
    data?.content?.[0]?.type === 'text' ? data.content[0].text : null;
  if (!text) throw new PolishUnavailableError('Unexpected API response format');

  return text.trim();
}
