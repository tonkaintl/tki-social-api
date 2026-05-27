// ----------------------------------------------------------------------------
// aiTellsCheck — runs after finalEditor. Scans the final draft against
// the admin-managed tells dictionary (writers_room_tells). Attaches
// findings to ctx.ai_tells so the orchestrator can:
//   1. snapshot them onto the writers_room_runs record
//   2. downgrade the run to `partial` if severity_score >= threshold,
//      which skips the spark-post forward + notification email
//
// Pure data attachment — does NOT throw. The pipeline always continues;
// the threshold check + downgrade happens in the orchestrator.
// ----------------------------------------------------------------------------

import { scanDraft } from '../aiTells.service.js';

export async function aiTellsCheck(ctx) {
  const draft =
    ctx?.final_draft?.story || ctx?.final_draft?.draft_markdown || '';
  const result = await scanDraft(draft);
  return {
    ...ctx,
    ai_tells: result,
  };
}
