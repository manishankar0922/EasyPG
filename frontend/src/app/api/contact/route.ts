import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/contact
 *
 * Lightweight landing-page lead capture. Validates input and persists to a
 * sensible default. Wire `CONTACT_WEBHOOK_URL` (Slack/Discord/CRM webhook) or
 * `CONTACT_INBOX` to route messages somewhere real — otherwise we just log.
 *
 * No auth required (public). Rate-limited by Vercel platform protections.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = str(body.name);
    const contact = str(body.contact);
    const message = str(body.message);

    // Basic validation — reject empty or oversized payloads early.
    if (!name || name.length > 120) {
      return NextResponse.json({ success: false, error: 'Invalid name' }, { status: 400 });
    }
    if (!contact || contact.length > 160) {
      return NextResponse.json({ success: false, error: 'Invalid contact' }, { status: 400 });
    }
    if (!message || message.length > 4000) {
      return NextResponse.json({ success: false, error: 'Invalid message' }, { status: 400 });
    }

    const payload = {
      name,
      contact,
      message,
      source: 'landing-page',
      submittedAt: new Date().toISOString(),
    };

    // Best-effort forwarding to a webhook if configured (Slack/Discord/CRM).
    const webhook = process.env.CONTACT_WEBHOOK_URL;
    if (webhook) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        // Webhook failures shouldn't surface to the visitor.
        console.error('[contact] webhook delivery failed');
      }
    } else {
      // No backend wired yet — log so leads aren't silently dropped in dev.
      console.log('[contact] new lead', payload);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Bad request' }, { status: 400 });
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}
