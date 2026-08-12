// ----------------------------------------------------------------------------
// Writer's Room — Social Media Director packaging node.
//
// The node's job is title variations + platform summaries. It must NEVER
// replace final_draft with the model's copy: the old prompt schema required
// the model to echo the whole ~4k-char draft back, and on 2026-06-15 a run
// came back with the punctuation mangled into literal ASCII ("last-minute" ->
// "lastADminute", "truck's" -> "truckADs"), which shipped to a published post.
// These tests pin the passthrough so the editor's text always wins.
// ----------------------------------------------------------------------------

import { beforeEach, describe, expect, it, vi } from 'vitest';

const callLlmFromPrompt = vi.fn();

vi.mock('../services/writersRoom/llm/index.js', () => ({
  callLlmFromPrompt: (...args) => callLlmFromPrompt(...args),
}));

const { socialMediaDirector } = await import(
  '../services/writersRoom/nodes/socialMediaDirector.js'
);

// U+2011 non-breaking hyphen + U+2019 apostrophe — the two characters the
// model mangled in the real incident.
const CLEAN_DRAFT = 'Prevent last‑minute disputes. The truck’s risk.';
const MANGLED_DRAFT = 'Prevent lastADminute disputes. The truckADs risk.';

const PACKAGE = {
  platform_summaries: {
    linkedin: 'li',
    meta: 'me',
    tonkaintl: 'tk',
    x: 'x',
    youtube: 'yt',
  },
  title_variations: ['a', 'b', 'c', 'd', 'e'],
};

const ctx = () => ({
  final_draft: {
    draft_markdown: CLEAN_DRAFT,
    role: 'final_editor',
    summary: 'A clean one‑page summary.',
    thesis: 'thesis',
    title: 'Original Title',
  },
  project: { brand: 'tonkaintl' },
});

beforeEach(() => {
  callLlmFromPrompt.mockReset();
});

describe('socialMediaDirector', () => {
  it('keeps the editor draft when the model echoes a mangled copy', async () => {
    callLlmFromPrompt.mockResolvedValue({
      final_draft: {
        draft_markdown: MANGLED_DRAFT,
        role: 'final_editor',
        summary: 'A clean oneADpage summary.',
        thesis: 'thesis',
        title: 'Original Title',
      },
      format_blog_post_generator: PACKAGE,
    });

    const out = await socialMediaDirector(ctx());

    expect(out.final_draft.draft_markdown).toBe(CLEAN_DRAFT);
    expect(out.final_draft.summary).toBe('A clean one‑page summary.');
    expect(out.final_draft.draft_markdown).not.toContain('AD');
    expect(out.blog_post_package).toEqual(PACKAGE);
  });

  it('keeps the editor draft even when the echoed copy looks fine', async () => {
    callLlmFromPrompt.mockResolvedValue({
      final_draft: { draft_markdown: 'a totally different draft' },
      format_blog_post_generator: PACKAGE,
    });

    const out = await socialMediaDirector(ctx());

    expect(out.final_draft.draft_markdown).toBe(CLEAN_DRAFT);
  });

  it('passes the draft through when the model omits final_draft', async () => {
    callLlmFromPrompt.mockResolvedValue({
      format_blog_post_generator: PACKAGE,
    });

    const out = await socialMediaDirector(ctx());

    expect(out.final_draft).toEqual(ctx().final_draft);
    expect(out.blog_post_package).toEqual(PACKAGE);
  });

  it('falls back to an empty package when the model returns nothing usable', async () => {
    callLlmFromPrompt.mockResolvedValue({});

    const out = await socialMediaDirector(ctx());

    expect(out.final_draft.draft_markdown).toBe(CLEAN_DRAFT);
    expect(out.blog_post_package.title_variations).toEqual([]);
    expect(out.blog_post_package.platform_summaries.linkedin).toBe('');
  });

  it('sends the draft INTO the prompt as input_json', async () => {
    callLlmFromPrompt.mockResolvedValue({
      format_blog_post_generator: PACKAGE,
    });

    await socialMediaDirector(ctx());

    const [slug, enriched] = callLlmFromPrompt.mock.calls[0];
    expect(slug).toBe('socialMediaDirector');
    expect(JSON.parse(enriched.input_json).final_draft.draft_markdown).toBe(
      CLEAN_DRAFT
    );
  });
});
