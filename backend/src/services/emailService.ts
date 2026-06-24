import type { ResearchItem } from '@prisma/client';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

function escapeHtml(s: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}

function buildDigestHtml(items: ResearchItem[]): string {
  const top = items.slice(0, 15);
  const rows = top
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;">
          <a href="${item.fullUrl}" style="font-weight:600;color:#111;text-decoration:none;">${escapeHtml(item.title)}</a><br/>
          <span style="color:#888;font-size:13px;">${item.source.toUpperCase()} &middot; Relevance ${item.relevanceScore.toFixed(1)}/10</span><br/>
          <span style="color:#444;font-size:14px;">${escapeHtml(item.snippet)}</span>
        </td>
      </tr>`
    )
    .join('');

  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2>Good morning! 🌅</h2>
      <p>Here are your top ${top.length} research findings for today:</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="margin-top:24px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}"
           style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">
          Review &amp; ideate in ContentIQ
        </a>
      </p>
    </div>`;
}

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendDailyDigest(items: ResearchItem[]): Promise<{ success: boolean; error?: string }> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('SMTP not configured, skipping email digest');
    return { success: false, error: 'SMTP not configured' };
  }
  try {
    const dateLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    await getTransport().sendMail({
      from: `ContentIQ <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: `ContentIQ Daily Brief — ${dateLabel}`,
      html: buildDigestHtml(items),
    });
    logger.info({ count: items.length }, 'daily digest email sent');
    return { success: true };
  } catch (err) {
    logger.error({ err }, 'failed to send daily digest email');
    return { success: false, error: (err as Error).message };
  }
}
