import {
  PIPELINE_ERROR_CODE,
  PIPELINE_NODE_VALUES,
} from '../../../constants/writersroom.js';
import { NODE_REGISTRY } from '../../../services/writersRoom/index.js';
import { logger } from '../../../utils/logger.js';

/**
 * Run ONE pipeline node in isolation. Lets you iterate on a single prompt
 * or transform without re-running the whole pipeline.
 *
 * Body:
 *   {
 *     node:     <PIPELINE_NODE value, e.g. "genreToneRouter">,
 *     context:  <object>  // shape depends on the node — e.g. for
 *                         // genreToneRouter you'd pass the post-projectMode
 *                         // ctx with story_seed, creative, project, etc.
 *   }
 *
 * Response: { ok, node, output, durationMs, requestId, error? }
 */
export async function testWritersRoomNode(req, res) {
  try {
    const { context = {}, node } = req.body || {};

    if (!node) {
      return res.status(400).json({
        code: PIPELINE_ERROR_CODE.INVALID_NODE_NAME,
        message: `node is required. Valid: ${PIPELINE_NODE_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }

    const fn = NODE_REGISTRY[node];
    if (!fn) {
      return res.status(400).json({
        code: PIPELINE_ERROR_CODE.INVALID_NODE_NAME,
        message: `Unknown node "${node}". Valid: ${PIPELINE_NODE_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }

    logger.info('[WritersRoom] Running single node', {
      node,
      requestId: req.id,
    });

    const startedAt = Date.now();
    const output = await fn(context);
    const durationMs = Date.now() - startedAt;

    return res.status(200).json({
      durationMs,
      node,
      ok: true,
      output,
      requestId: req.id,
    });
  } catch (err) {
    logger.error('[WritersRoom] Single-node run failed', {
      error: err.message,
      requestId: req.id,
      stack: err.stack,
    });
    return res.status(500).json({
      code: err.code || PIPELINE_ERROR_CODE.NODE_NOT_IMPLEMENTED,
      message: err.message,
      requestId: req.id,
    });
  }
}
