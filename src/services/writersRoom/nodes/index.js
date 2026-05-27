// ----------------------------------------------------------------------------
// Node registry — maps PIPELINE_NODE values to their node functions so the
// test-node endpoint can run any single node in isolation.
// ----------------------------------------------------------------------------

import { PIPELINE_NODE } from '../../../constants/writersroom.js';

import { aiTellsCheck } from './aiTellsCheck.js';
import { artDirector } from './artDirector.js';
import { buildWriterPanel } from './buildWriterPanel.js';
import { draftContext } from './draftContext.js';
import { finalDispatch } from './finalDispatch.js';
import { finalEditor } from './finalEditor.js';
import { futureStoryArc } from './futureStoryArc.js';
import { genreToneRouter } from './genreToneRouter.js';
import { headWriter } from './headWriter.js';
import { inputNormalizer } from './inputNormalizer.js';
import { projectMode } from './projectMode.js';
import { researcher } from './researcher.js';
import { socialMediaDirector } from './socialMediaDirector.js';
import { writerAction } from './writers/action.js';
import { writerBiographer } from './writers/biographer.js';
import { writerComedy } from './writers/comedy.js';
import { writerDocumentary } from './writers/documentary.js';
import { writerHistoric } from './writers/historic.js';
import { writerSciFi } from './writers/scifi.js';

export const NODE_REGISTRY = {
  [PIPELINE_NODE.AI_TELLS_CHECK]: aiTellsCheck,
  [PIPELINE_NODE.ART_DIRECTOR]: artDirector,
  [PIPELINE_NODE.BUILD_WRITER_PANEL]: buildWriterPanel,
  [PIPELINE_NODE.DRAFT_CONTEXT]: draftContext,
  [PIPELINE_NODE.FINAL_DISPATCH]: finalDispatch,
  [PIPELINE_NODE.FINAL_EDITOR]: finalEditor,
  [PIPELINE_NODE.FUTURE_STORY_ARC]: futureStoryArc,
  [PIPELINE_NODE.GENRE_TONE_ROUTER]: genreToneRouter,
  [PIPELINE_NODE.HEAD_WRITER]: headWriter,
  [PIPELINE_NODE.INPUT_NORMALIZER]: inputNormalizer,
  [PIPELINE_NODE.PROJECT_MODE]: projectMode,
  [PIPELINE_NODE.RESEARCHER]: researcher,
  [PIPELINE_NODE.SOCIAL_MEDIA_DIRECTOR]: socialMediaDirector,
  [PIPELINE_NODE.WRITER_ACTION]: writerAction,
  [PIPELINE_NODE.WRITER_BIOGRAPHER]: writerBiographer,
  [PIPELINE_NODE.WRITER_COMEDY]: writerComedy,
  [PIPELINE_NODE.WRITER_DOCUMENTARY]: writerDocumentary,
  [PIPELINE_NODE.WRITER_HISTORIC]: writerHistoric,
  [PIPELINE_NODE.WRITER_SCIFI]: writerSciFi,
};
