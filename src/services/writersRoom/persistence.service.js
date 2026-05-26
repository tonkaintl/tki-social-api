// ----------------------------------------------------------------------------
// WritersRoom run persistence — thin wrapper around the WritersRoomRun
// model so the orchestrator never has to know about Mongo specifics. Every
// run gets a record (success, failure, or in-flight crash); snapshots are
// captured at each phase boundary so failed runs can be mined for gems.
// ----------------------------------------------------------------------------

import mongoose from 'mongoose';

import { RUN_STATUS } from '../../constants/writersroom.js';
import WritersRoomRun from '../../models/writersRoomRun.model.js';
import { logger } from '../../utils/logger.js';

// Track whether we've already logged the "Mongo not connected" warning
// this process — without this guard, every step would log it and flood
// the log stream during a DB outage.
let warnedDisconnected = false;

// Fast-fail when Mongo isn't connected. Without this guard mongoose
// buffers writes for 10s before timing out, and the orchestrator hits
// ~15 persistence touch-points per run — that's 150s of dead air on a
// single DB blip. readyState values: 0=disconnected, 1=connected,
// 2=connecting, 3=disconnecting.
function mongoReady() {
  return mongoose.connection.readyState === 1;
}

// All persistence calls swallow errors so the pipeline never dies because
// the run-log DB hiccupped. We log loudly and return null; the orchestrator
// keeps going.
async function safe(fn, label) {
  if (!mongoReady()) {
    if (!warnedDisconnected) {
      logger.warn(
        '[WritersRoom] persistence: Mongo not connected — runs will not be archived'
      );
      warnedDisconnected = true;
    }
    return null;
  }
  try {
    return await fn();
  } catch (err) {
    logger.error(`[WritersRoom] persistence: ${label} failed`, {
      error: err.message,
      stack: err.stack,
    });
    return null;
  }
}

export async function createRun({
  ideaRotation = null,
  input,
  requestId = null,
  triggeredBy,
}) {
  return safe(async () => {
    const doc = await WritersRoomRun.create({
      idea_rotation: ideaRotation,
      input,
      project_mode: input?.project_mode || null,
      request_id: requestId,
      snapshots: {},
      status: RUN_STATUS.RUNNING,
      story_seed: input?.story_seed || null,
      target_brand: input?.target_brand || null,
      trace: [],
      triggered_by: triggeredBy,
    });
    return doc;
  }, 'createRun');
}

// Atomically push a trace entry. Called after every step in the
// orchestrator, including failures.
export async function appendTrace(runId, entry) {
  if (!runId) return;
  await safe(
    () => WritersRoomRun.updateOne({ _id: runId }, { $push: { trace: entry } }),
    'appendTrace'
  );
}

// Merge a snapshot block. Caller decides which keys to set (e.g. after
// genreToneRouter we set { writers }; after researcher we set { research }).
export async function recordSnapshot(runId, snapshot) {
  if (!runId || !snapshot) return;
  const $set = {};
  for (const [key, val] of Object.entries(snapshot)) {
    if (val !== undefined) $set[`snapshots.${key}`] = val;
  }
  if (Object.keys($set).length === 0) return;
  await safe(
    () => WritersRoomRun.updateOne({ _id: runId }, { $set }),
    'recordSnapshot'
  );
}

export async function finalizeSuccess(
  runId,
  {
    durationMs,
    finalPayload,
    sparkPostDocumentId = null,
    status = RUN_STATUS.SUCCEEDED,
  }
) {
  if (!runId) return;
  await safe(
    () =>
      WritersRoomRun.updateOne(
        { _id: runId },
        {
          $set: {
            duration_ms: durationMs,
            final_payload: finalPayload,
            finished_at: new Date(),
            forwarded_to_spark_post: !!sparkPostDocumentId,
            spark_post_document_id: sparkPostDocumentId,
            status,
          },
        }
      ),
    'finalizeSuccess'
  );
}

export async function finalizeFailure(runId, { durationMs, error }) {
  if (!runId) return;
  await safe(
    () =>
      WritersRoomRun.updateOne(
        { _id: runId },
        {
          $set: {
            duration_ms: durationMs,
            error: {
              code: error?.code || null,
              message: error?.message || String(error),
              stack: error?.stack || null,
            },
            finished_at: new Date(),
            status: RUN_STATUS.FAILED,
          },
        }
      ),
    'finalizeFailure'
  );
}

// Read APIs — used by GET /runs and GET /runs/:id.

export async function listRuns({
  brand = null,
  limit = 25,
  mode = null,
  page = 1,
  since = null,
  status = null,
  storySeed = null,
  triggeredBy = null,
  until = null,
} = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (brand) filter.target_brand = brand;
  if (mode) filter.project_mode = mode;
  if (triggeredBy) filter.triggered_by = triggeredBy;
  if (storySeed) filter.story_seed = new RegExp(storySeed, 'i');
  if (since || until) {
    filter.created_at = {};
    if (since) filter.created_at.$gte = new Date(since);
    if (until) filter.created_at.$lte = new Date(until);
  }

  const skip = (page - 1) * limit;
  const [items, totalCount] = await Promise.all([
    WritersRoomRun.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      // List view doesn't need the heavy fields — drop final_payload + snapshots.
      .select(
        '-final_payload -snapshots.head_writer_system_message -snapshots.writer_notes -snapshots.final_draft -snapshots.head_draft'
      )
      .lean(),
    WritersRoomRun.countDocuments(filter),
  ]);

  return {
    count: items.length,
    items,
    page,
    totalCount,
    totalPages: limit === 0 ? 1 : Math.ceil(totalCount / limit),
  };
}

export async function getRun(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return WritersRoomRun.findById(id).lean();
}
