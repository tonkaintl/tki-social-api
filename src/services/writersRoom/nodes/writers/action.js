import { runWriterBrainstorm } from './_brainstorm.js';

export const ROLE = 'action';
export const PROMPT_SLUG = 'writers/action';

export async function writerAction(ctx) {
  return runWriterBrainstorm({ ctx, role: ROLE, slug: PROMPT_SLUG });
}
