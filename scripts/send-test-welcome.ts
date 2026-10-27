import fs from 'node:fs';
import path from 'node:path';
import { sendWelcomeEmail, buildWelcomeEmailHtml } from '@/lib/welcomeEmail';

async function main() {
  const arg1 = process.argv[2];
  const isPreview = arg1 === '--preview' || arg1 === 'preview';
  const to = isPreview ? null : arg1;
  const companyName = process.argv[3] || 'Apex Heating & Air';
  const tradeVertical = process.argv[4] || 'HVAC';
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'https://pradojob.com';

  if (isPreview) {
    const html = buildWelcomeEmailHtml({
      companyName,
      tradeVertical,
      appBaseUrl,
    });
    const outputPath = path.resolve(process.cwd(), 'test-welcome-email.html');
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`\n🎉 Preview generated successfully!`);
    console.log(`   File: ${outputPath}`);
    console.log(`   Open this file in your browser to inspect the email.\n`);
    return;
  }

  if (!to) {
    console.error('\n❌ Error: Recipient email is required (or use "preview" to generate an HTML file).\n');
    console.log('Usage:');
    console.log('  npm run email:test -- <email> [companyName] [tradeVertical]');
    console.log('  npm run email:test -- preview [companyName] [tradeVertical]\n');
    console.log('Examples:');
    console.log('  npm run email:test -- your@email.com');
    console.log('  npm run email:test -- your@email.com "Prado Plumbing" "Plumbing"');
    console.log('  npm run email:test -- preview "Apex Electric" "Electrical"\n');
    process.exit(1);
  }

  console.log('📧 Sending test Welcome Email...');
  console.log(`   To:             ${to}`);
  console.log(`   Company Name:   ${companyName}`);
  console.log(`   Trade Vertical: ${tradeVertical}`);
  console.log(`   App Base URL:   ${appBaseUrl}`);
  console.log(`   API Key loaded: ${process.env.RESEND_API_KEY ? 'Yes (starts with ' + process.env.RESEND_API_KEY.slice(0, 7) + '...)' : 'NO ❌'}\n`);

  const result = await sendWelcomeEmail({
    to,
    companyName,
    tradeVertical,
    appBaseUrl,
  });

  if (result.success) {
    console.log(`✅ Welcome email dispatched successfully to ${to}!\n`);
  } else {
    console.error(`❌ Failed to send welcome email: ${result.error}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
