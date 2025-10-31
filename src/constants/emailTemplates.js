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
};
