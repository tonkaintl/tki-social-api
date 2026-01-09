import { config } from './src/config/env.js';
// Test sending email to multiple recipients
import { emailService } from './src/services/email.service.js';

async function testEmail() {
  try {
    console.log('Testing email to multiple recipients...');
    console.log('Recipients from env:', config.TONKA_SPARK_RECIPIENTS);

    const recipients = config.TONKA_SPARK_RECIPIENTS.split(',').map(e =>
      e.trim()
    );
    console.log('Parsed recipients array:', recipients);

    await emailService.sendEmail({
      htmlBody: `
        <h1>Test Email</h1>
        <p>This is a test email sent to multiple recipients.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
        <p>Recipients: ${recipients.join(', ')}</p>
      `,
      subject: 'Test Email - Multiple Recipients',
      to: recipients,
    });

    console.log('✅ Email sent successfully to:', recipients.join(', '));
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testEmail();
