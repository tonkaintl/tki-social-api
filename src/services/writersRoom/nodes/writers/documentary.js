import { runWriterBrainstorm } from './_brainstorm.js';

export const ROLE = 'documentary';
export const PROMPT_SLUG = 'writers/documentary';

export async function writerDocumentary(ctx) {
  return runWriterBrainstorm({ ctx, role: ROLE, slug: PROMPT_SLUG });
}
