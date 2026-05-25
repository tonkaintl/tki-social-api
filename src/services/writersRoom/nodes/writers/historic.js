import { runWriterBrainstorm } from './_brainstorm.js';

export const ROLE = 'historic';
export const PROMPT_SLUG = 'writers/historic';

export async function writerHistoric(ctx) {
  return runWriterBrainstorm({ ctx, role: ROLE, slug: PROMPT_SLUG });
}
