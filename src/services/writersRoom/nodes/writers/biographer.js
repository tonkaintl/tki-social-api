import { runWriterBrainstorm } from './_brainstorm.js';

export const ROLE = 'biographer';
export const PROMPT_SLUG = 'writers/biographer';

export async function writerBiographer(ctx) {
  return runWriterBrainstorm({ ctx, role: ROLE, slug: PROMPT_SLUG });
}
