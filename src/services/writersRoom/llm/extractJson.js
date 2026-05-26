// ----------------------------------------------------------------------------
// extractJson — robust JSON extraction from a model's free-text response.
//
// LLMs that don't have a native JSON-object mode (Gemini reasoning models,
// Perplexity Sonar) often wrap JSON output in markdown fences and/or
// preamble despite explicit instructions:
//
//   Here is the JSON requested:
//   ```json
//   { "answer": "Paris" }
//   ```
//
// Strategy:
//   1. Strip leading/trailing whitespace
//   2. If the trimmed text starts with '{' or '[' and ends with the
//      matching bracket, try parsing directly
//   3. Otherwise locate the first '{' and matching '}' (or '[' / ']') and
//      extract that span
//   4. Parse — throw if still invalid
//
// We don't try to fix invalid JSON (unterminated strings, trailing commas,
// etc.) — that's a model-prompt problem, not a parsing problem.
// ----------------------------------------------------------------------------

export function extractJson(text) {
  if (typeof text !== 'string') {
    throw new Error('extractJson: input is not a string');
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new Error('extractJson: input is empty');
  }

  // Fast path: already clean JSON.
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    return JSON.parse(trimmed);
  }

  // Find the outermost JSON span. We pick whichever bracket appears
  // first — object or array — and find its matching close. We don't do
  // full bracket-counting (that's overkill for typical LLM output) — we
  // just take the last matching close character in the text, since LLMs
  // rarely append content after their JSON.
  const firstObj = trimmed.indexOf('{');
  const firstArr = trimmed.indexOf('[');

  let openIdx;
  let closeChar;
  if (firstObj === -1 && firstArr === -1) {
    throw new Error('extractJson: no JSON bracket found');
  } else if (firstArr === -1 || (firstObj !== -1 && firstObj < firstArr)) {
    openIdx = firstObj;
    closeChar = '}';
  } else {
    openIdx = firstArr;
    closeChar = ']';
  }

  const closeIdx = trimmed.lastIndexOf(closeChar);
  if (closeIdx <= openIdx) {
    throw new Error('extractJson: no closing bracket found');
  }

  const span = trimmed.slice(openIdx, closeIdx + 1);
  return JSON.parse(span);
}
