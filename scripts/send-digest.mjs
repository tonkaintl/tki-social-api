// Send the Tonka Dispatch digest email for an already-saved rankings batch.
// Usage: node scripts/send-digest.mjs <batch_id>
import 'dotenv/config';
import mongoose from 'mongoose';

const batchId = process.argv[2];
if (!batchId) {
  console.error('Usage: node scripts/send-digest.mjs <batch_id>');
  process.exit(1);
}

// direct (non-SRV) connection
function directUri(uri) {
  if (!uri.startsWith('mongodb+srv://')) return uri;
  const m = uri.match(/^mongodb\+srv:\/\/([^@]+)@([^/]+)\/([^?]+)(\?.*)?$/);
  const [, creds, host, dbName] = m;
  const base = host.replace(/^[^.]+\./, '');
  const prefix = host.split('.')[0];
  const hosts = [0, 1, 2]
    .map(i => `${prefix}-shard-00-0${i}.${base}:27017`)
    .join(',');
  return `mongodb://${creds}@${hosts}/${dbName}?ssl=true&replicaSet=atlas-uys7di-shard-0&authSource=admin&retryWrites=true&w=majority`;
}

await mongoose.connect(directUri(process.env.MONGODB_TKISOCIAL_URI));
const { config } = await import('../src/config/env.js');
const { emailService } = await import('../src/services/email.service.js');
const TonkaDispatchRanking = (
  await import('../src/models/tonkaDispatchRankings.model.js')
).default;

const rows = await TonkaDispatchRanking.find({ batch_id: batchId })
  .sort({ rank: 1 })
  .lean();
if (rows.length === 0) {
  console.error(`No rankings found for batch ${batchId}`);
  process.exit(1);
}

function fmtDate(ms) {
  if (!ms || !Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Chicago',
    year: 'numeric',
  });
}

const today = new Date().toLocaleDateString('en-US', {
  day: '2-digit',
  month: 'short',
  timeZone: 'America/Chicago',
  weekday: 'short',
  year: 'numeric',
});

const htmlRows = rows
  .map((a, i) => {
    const meta = [a.category, fmtDate(a.pub_date_ms)]
      .filter(Boolean)
      .join(' · ');
    const snip = a.snippet
      ? `<br><span style="font-size:13px;color:#444;">${a.snippet.slice(0, 300)}${a.snippet.length > 300 ? '…' : ''}</span>`
      : '';
    return `<tr>
      <td style="padding:4px 8px;color:#888;font-size:12px;vertical-align:top;">${i + 1}</td>
      <td style="padding:4px 8px;vertical-align:top;">
        <a href="${a.link || '#'}" style="font-weight:600;color:#1a1a1a;text-decoration:none;">${a.title || a.canonical_id}</a>
        ${meta ? `<br><span style="font-size:12px;color:#666;">${meta}</span>` : ''}
        ${snip}
      </td></tr>`;
  })
  .join('');

const htmlBody = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#1a1a1a;">
  <h2 style="border-bottom:2px solid #e0e0e0;padding-bottom:8px;">Tonka Dispatch — ${today}</h2>
  <p style="font-size:13px;color:#666;">${rows.length} articles selected. Batch: <code>${batchId}</code></p>
  <table style="width:100%;border-collapse:collapse;">${htmlRows}</table>
</body></html>`;

const to = config.TONKA_DISPATCH_RECIPIENTS.split(',').map(e => e.trim());
console.log(
  `Sending "${batchId}" (${rows.length} articles) to: ${to.join(', ')}`
);
await emailService.sendEmail({
  htmlBody,
  subject: `Tonka Dispatch Dailies - ${today}`,
  to,
});
console.log('Email sent.');
await mongoose.disconnect();
process.exit(0);
