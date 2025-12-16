// -----------------------------------------------------------------------------
// EMAIL TEMPLATE HELPERS
// -----------------------------------------------------------------------------

const EMAIL_TEMPLATE = {
  CODE_BLOCK: content =>
    `<pre style="background: #f4f4f4; padding: 10px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; word-wrap: break-word;">${content}</pre>`,
  SIGNATURE: '<p>Best regards,<br />TKI Social Media Team</p>',
  SUPPORT_CONTACT: `<p>For support, contact the development team at <a href="mailto:stephen@tonkaintl.com">stephen@tonkaintl.com</a></p>`,
  TIMESTAMP: timestamp =>
    `<p><small><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString()}</small></p>`,
};

// -----------------------------------------------------------------------------
// WRITERS ROOM EMAIL TEMPLATES
// -----------------------------------------------------------------------------

export const WRITERS_ROOM_EMAIL_TEMPLATES = {
  AD_NOTIFICATION: {
    BODY: ({
      ad_id,
      condition,
      copy,
      date,
      end_phrase,
      exw,
      headline,
      hook,
      is_pass,
      issues,
      issues_guard,
      platform_targets,
      price_usd,
      specs,
      stock_number,
      subject,
      tagline,
      timestamp,
      tone_variant,
    }) => `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h2 style="color: #b70000;">✍️ Writers Room Ad Ready for Review</h2>
        
        ${is_pass ? '<p style="background-color: #d4edda; color: #155724; padding: 10px; border-radius: 4px;">✅ <strong>Validation Passed</strong></p>' : '<p style="background-color: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px;">⚠️ <strong>Validation Issues Detected</strong></p>'}
        
        <h3 style="border-bottom: 2px solid #b70000; padding-bottom: 5px;">📋 Ad Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold; width: 30%;">Ad ID:</td>
            <td style="padding: 8px;">${ad_id}</td>
          </tr>
          ${subject ? `<tr><td style="padding: 8px; font-weight: bold;">Subject:</td><td style="padding: 8px;">${subject}</td></tr>` : ''}
          ${stock_number ? `<tr><td style="padding: 8px; font-weight: bold;">Stock Number:</td><td style="padding: 8px;">${stock_number}</td></tr>` : ''}
          ${date ? `<tr><td style="padding: 8px; font-weight: bold;">Date:</td><td style="padding: 8px;">${date}</td></tr>` : ''}
          ${tone_variant ? `<tr><td style="padding: 8px; font-weight: bold;">Tone:</td><td style="padding: 8px;">${tone_variant}</td></tr>` : ''}
        </table>
        
        ${headline ? `<h3 style="border-bottom: 2px solid #b70000; padding-bottom: 5px; margin-top: 20px;">📰 Headline</h3><p style="font-size: 18px; font-weight: bold; color: #333;">${headline}</p>` : ''}
        
        ${hook ? `<h3 style="border-bottom: 2px solid #b70000; padding-bottom: 5px; margin-top: 20px;">🎣 Hook</h3><p style="font-style: italic; color: #555;">${hook}</p>` : ''}
        
        ${copy ? `<h3 style="border-bottom: 2px solid #b70000; padding-bottom: 5px; margin-top: 20px;">📝 Copy</h3><div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #b70000; border-radius: 4px;"><p style="line-height: 1.6; margin: 0;">${copy}</p></div>` : ''}
        
        ${end_phrase ? `<p style="font-style: italic; color: #666; margin-top: 10px;">${end_phrase}</p>` : ''}
        
        ${tagline ? `<p style="font-size: 12px; color: #999; margin-top: 5px; font-style: italic;">${tagline}</p>` : ''}
        
        <h3 style="border-bottom: 2px solid #b70000; padding-bottom: 5px; margin-top: 20px;">💰 Pricing & Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${price_usd ? `<tr><td style="padding: 8px; font-weight: bold; width: 30%;">Price:</td><td style="padding: 8px;">${price_usd}</td></tr>` : ''}
          ${exw ? `<tr><td style="padding: 8px; font-weight: bold;">EXW:</td><td style="padding: 8px;">${exw}</td></tr>` : ''}
          ${condition ? `<tr><td style="padding: 8px; font-weight: bold;">Condition:</td><td style="padding: 8px;">${condition}</td></tr>` : ''}
          ${specs ? `<tr><td style="padding: 8px; font-weight: bold;">Specs:</td><td style="padding: 8px;">${specs}</td></tr>` : ''}
        </table>
        
        ${platform_targets && platform_targets.length > 0 ? `<h3 style="border-bottom: 2px solid #b70000; padding-bottom: 5px; margin-top: 20px;">🎯 Target Platforms</h3><p>${platform_targets.join(', ')}</p>` : ''}
        
        ${issues && issues.length > 0 ? `<h3 style="border-bottom: 2px solid #b70000; padding-bottom: 5px; margin-top: 20px;">⚠️ Validation Issues</h3><ul style="color: #721c24;">${issues.map(issue => `<li>${issue}</li>`).join('')}</ul>` : ''}
        
        ${issues_guard && issues_guard.length > 0 ? `<h3 style="border-bottom: 2px solid #b70000; padding-bottom: 5px; margin-top: 20px;">🛡️ Guard Issues</h3><ul style="color: #856404;">${issues_guard.map(issue => `<li>${issue}</li>`).join('')}</ul>` : ''}
        
        ${EMAIL_TEMPLATE.TIMESTAMP(timestamp || new Date())}
        ${EMAIL_TEMPLATE.SIGNATURE}
      </div>
    `,

    SUBJECT: ({ subject }) =>
      subject ? `Writers Room Ad: ${subject}` : 'Writers Room Ad Notification',
  },

  ERROR_NOTIFICATION: {
    BODY: ({ ad_id, errorDetails, errorMessage, timestamp }) => `
      <h2 style="color: #dc3545;">🚨 Writers Room Processing Error</h2>
      
      <p>An error occurred while processing a Writers Room ad.</p>
      
      <h3>❌ Error Details</h3>
      <ul>
        <li><strong>Ad ID:</strong> ${ad_id || 'N/A'}</li>
        <li><strong>Error:</strong> ${errorMessage}</li>
      </ul>
      
      <h3>🔍 Technical Details</h3>
      ${EMAIL_TEMPLATE.CODE_BLOCK(JSON.stringify(errorDetails, null, 2))}
      
      ${EMAIL_TEMPLATE.TIMESTAMP(timestamp || new Date())}
      ${EMAIL_TEMPLATE.SUPPORT_CONTACT}
      ${EMAIL_TEMPLATE.SIGNATURE}
    `,

    SUBJECT: ({ ad_id }) => `🚨 Writers Room Error: ${ad_id || 'Unknown Ad'}`,
  },

  CONTENT_NOTIFICATION: {
    BODY: ({
      content_id,
      doc_link,
      final_draft,
      future_story_arc_generator,
      outputs,
      platform_summaries,
      project,
      research,
      timestamp,
      title_variations,
      visual_prompts,
      writer_notes,
    }) => {
      const formatList = (items, prefix = '- ') =>
        items && items.length > 0
          ? items.map(item => `${prefix}${item}`).join('\n')
          : 'n/a';

      const formatArc = (arc, index) => `
        <h4 style="color: #b70000; margin-top: 15px;">Arc ${index + 1} Title:</h4>
        <p><strong>${arc?.arc_title || 'n/a'}</strong></p>
        
        <p><strong>Premise:</strong></p>
        <p>${arc?.one_line_premise || 'n/a'}</p>
        
        <p><strong>Why It Matters:</strong></p>
        <p>${arc?.why_it_matters || 'n/a'}</p>
        
        <p><strong>Suggested Story Seed:</strong></p>
        <p>${arc?.suggested_story_seed || 'n/a'}</p>
      `;

      const formatVisualPrompt = (vp, index) => `
        <div style="margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #b70000;">
          <p><strong>(${vp?.id || 'n/a'}) [${vp?.intent || 'n/a'}]</strong></p>
          <p>${vp?.prompt || 'n/a'}</p>
        </div>
      `;

      return `
        <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
          <h2 style="color: #b70000; border-bottom: 3px solid #b70000; padding-bottom: 10px;">✍️ Writer's Room Final Draft</h2>
          
          ${doc_link ? `<p style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;"><strong>📄 <a href="${doc_link}" target="_blank" style="color: #155724;">View Full Document in Google Drive</a></strong></p>` : ''}
          
          <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">FINAL DRAFT LOG</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px; font-weight: bold; width: 30%;">Run Timestamp:</td>
                <td style="padding: 5px;">${timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 5px; font-weight: bold;">Content ID:</td>
                <td style="padding: 5px;">${content_id || 'n/a'}</td>
              </tr>
              <tr>
                <td style="padding: 5px; font-weight: bold;">Project Mode:</td>
                <td style="padding: 5px;">${project?.mode || 'n/a'}</td>
              </tr>
              <tr>
                <td style="padding: 5px; font-weight: bold;">Brand:</td>
                <td style="padding: 5px;">${project?.brand_meta?.name || 'n/a'}</td>
              </tr>
              <tr>
                <td style="padding: 5px; font-weight: bold;">Target Audience:</td>
                <td style="padding: 5px;">${project?.audience || 'n/a'}</td>
              </tr>
            </table>
          </div>
          
          <hr style="border: 0; border-top: 2px solid #ccc; margin: 30px 0;" />
          
          ${final_draft?.title ? `<h3 style="color: #b70000; font-size: 24px;">TITLE</h3><p style="font-size: 20px; font-weight: bold;">${final_draft.title}</p>` : ''}
          
          ${final_draft?.thesis ? `<h3 style="color: #b70000; margin-top: 25px;">THESIS</h3><p style="font-style: italic; background: #fffbea; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px;">${final_draft.thesis}</p>` : ''}
          
          ${final_draft?.draft_markdown ? `<h3 style="color: #b70000; margin-top: 25px;">ARTICLE BODY (FINAL DRAFT)</h3><div style="background: #ffffff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; line-height: 1.8;"><pre style="white-space: pre-wrap; font-family: Georgia, serif; font-size: 15px;">${final_draft.draft_markdown}</pre></div>` : ''}
          
          ${final_draft?.summary ? `<h3 style="color: #b70000; margin-top: 25px;">SUMMARY</h3><p style="background: #e8f4f8; padding: 15px; border-left: 4px solid #0284c7; border-radius: 4px;">${final_draft.summary}</p>` : ''}
          
          <hr style="border: 0; border-top: 2px solid #ccc; margin: 30px 0;" />
          
          ${writer_notes ? `<h3 style="color: #b70000;">WRITER NOTES (CREATIVE INPUTS)</h3>` : ''}
          
          ${writer_notes?.action?.notes ? `<h4 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 5px;">ACTION NOTES</h4><pre style="white-space: pre-wrap; font-family: monospace; background: #f4f4f4; padding: 10px; border-radius: 4px;">${formatList(writer_notes.action.notes)}</pre>` : ''}
          
          ${writer_notes?.comedy?.notes ? `<h4 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 20px;">COMEDY NOTES</h4><pre style="white-space: pre-wrap; font-family: monospace; background: #f4f4f4; padding: 10px; border-radius: 4px;">${formatList(writer_notes.comedy.notes)}</pre>` : ''}
          
          ${writer_notes?.documentary?.notes ? `<h4 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 20px;">DOCUMENTARY NOTES</h4><pre style="white-space: pre-wrap; font-family: monospace; background: #f4f4f4; padding: 10px; border-radius: 4px;">${formatList(writer_notes.documentary.notes)}</pre>` : ''}
          
          <hr style="border: 0; border-top: 2px solid #ccc; margin: 30px 0;" />
          
          ${title_variations && title_variations.length > 0 ? `<h3 style="color: #b70000;">TITLE VARIATIONS</h3><ol style="line-height: 2;">${title_variations.map(title => `<li>${title || 'n/a'}</li>`).join('')}</ol>` : ''}
          
          <hr style="border: 0; border-top: 2px solid #ccc; margin: 30px 0;" />
          
          ${
            platform_summaries
              ? `
            <h3 style="color: #b70000;">PLATFORM SUMMARIES</h3>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
              ${platform_summaries.youtube ? `<p><strong>YouTube:</strong><br>${platform_summaries.youtube}</p>` : ''}
              ${platform_summaries.linkedin ? `<p><strong>LinkedIn:</strong><br>${platform_summaries.linkedin}</p>` : ''}
              ${platform_summaries.x ? `<p><strong>X:</strong><br>${platform_summaries.x}</p>` : ''}
              ${platform_summaries.meta ? `<p><strong>Meta:</strong><br>${platform_summaries.meta}</p>` : ''}
              ${platform_summaries.tonkaintl ? `<p><strong>TonkaIntl:</strong><br>${platform_summaries.tonkaintl}</p>` : ''}
            </div>
          `
              : ''
          }
          
          <hr style="border: 0; border-top: 2px solid #ccc; margin: 30px 0;" />
          
          ${
            future_story_arc_generator?.arcs &&
            future_story_arc_generator.arcs.length > 0
              ? `
            <h3 style="color: #b70000;">FUTURE STORY ARC GENERATOR</h3>
            ${future_story_arc_generator.arcs.map((arc, idx) => formatArc(arc, idx)).join('<hr style="border: 0; border-top: 1px dashed #ccc; margin: 20px 0;" />')}
          `
              : ''
          }
          
          <hr style="border: 0; border-top: 2px solid #ccc; margin: 30px 0;" />
          
          ${
            visual_prompts && visual_prompts.length > 0
              ? `
            <h3 style="color: #b70000;">VISUAL PROMPTS</h3>
            ${visual_prompts.map((vp, idx) => formatVisualPrompt(vp, idx)).join('')}
          `
              : ''
          }
          
          <hr style="border: 0; border-top: 2px solid #ccc; margin: 30px 0;" />
          
          ${
            research
              ? `
            <h3 style="color: #b70000;">RESEARCH RECEIPT</h3>
            <table style="width: 100%; border-collapse: collapse; background: #f9f9f9; padding: 15px;">
              <tr>
                <td style="padding: 8px; font-weight: bold; width: 30%;">Research Enabled:</td>
                <td style="padding: 8px;">${research.enable_research !== undefined ? research.enable_research : 'n/a'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Research Claim:</td>
                <td style="padding: 8px;">${research.facts || 'n/a'}</td>
              </tr>
            </table>
            ${research.sources && research.sources.length > 0 ? `<p><strong>Sources:</strong></p><pre style="white-space: pre-wrap; font-family: monospace; background: #f4f4f4; padding: 10px; border-radius: 4px;">${formatList(research.sources)}</pre>` : ''}
            ${research.citations && research.citations.length > 0 ? `<p><strong>Citations:</strong></p><pre style="white-space: pre-wrap; font-family: monospace; background: #f4f4f4; padding: 10px; border-radius: 4px;">${formatList(research.citations)}</pre>` : ''}
          `
              : ''
          }
          
          <hr style="border: 0; border-top: 2px solid #ccc; margin: 30px 0;" />
          
          ${
            outputs
              ? `
            <h3 style="color: #b70000;">OUTPUT FLAGS</h3>
            <pre style="background: #f4f4f4; padding: 15px; border-radius: 4px; font-family: monospace;">${JSON.stringify(outputs, null, 2)}</pre>
          `
              : ''
          }
          
          ${EMAIL_TEMPLATE.TIMESTAMP(timestamp || new Date())}
          ${EMAIL_TEMPLATE.SIGNATURE}
        </div>
      `;
    },

    SUBJECT: ({ brand, title }) => {
      if (title && brand) {
        return `Writer's Room: ${title} [${brand}]`;
      }
      if (title) {
        return `Writer's Room: ${title}`;
      }
      return "Writer's Room Content Ready";
    },
  },
};
