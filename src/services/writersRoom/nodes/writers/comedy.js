import { runWriterBrainstorm } from './_brainstorm.js';

export const ROLE = 'comedy';
export const PROMPT_SLUG = 'writers/comedy';

export async function writerComedy(ctx) {
  return runWriterBrainstorm({ ctx, role: ROLE, slug: PROMPT_SLUG });
}
