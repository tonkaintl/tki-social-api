import { runWriterBrainstorm } from './_brainstorm.js';

export const ROLE = 'scifi';
export const PROMPT_SLUG = 'writers/scifi';

export async function writerSciFi(ctx) {
  return runWriterBrainstorm({ ctx, role: ROLE, slug: PROMPT_SLUG });
}
