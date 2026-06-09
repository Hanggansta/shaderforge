import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyCreemSignature } from '../_lib/verify-creem-signature.js';
import {
  buildProductTierMap,
  parseCreemWebhook,
  processCreemWebhookEvent,
} from '../../src/billing/creem-webhook.js';
import { extractCreemIds, updateClerkUserTier } from '../../src/billing/clerk-tier.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CREEM_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[creem-webhook] CREEM_WEBHOOK_SECRET missing');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers['creem-signature'];
  const signatureValue = Array.isArray(signature) ? signature[0] : signature;

  if (!verifyCreemSignature(rawBody, signatureValue, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = parseCreemWebhook(rawBody);
  if (!event) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const productMap = buildProductTierMap({
    proProductIds: process.env.CREEM_PRODUCT_PRO_IDS,
    teamProductIds: process.env.CREEM_PRODUCT_TEAM_IDS,
  });

  const decision = processCreemWebhookEvent(event, productMap);

  if (decision.action === 'ignore') {
    console.info('[creem-webhook] ignored', {
      eventId: event.id,
      eventType: event.eventType,
      reason: decision.reason,
    });
    return res.status(200).json({ received: true, action: 'ignore', reason: decision.reason });
  }

  if (!decision.userId || !decision.tier) {
    return res.status(200).json({
      received: true,
      action: 'ignore',
      reason: 'Missing user or tier after processing',
    });
  }

  const creemIds = extractCreemIds(event.object);
  const update = await updateClerkUserTier(
    process.env.CLERK_SECRET_KEY,
    decision.userId,
    {
      tier: decision.tier,
      creemCustomerId: creemIds.customerId,
      creemSubscriptionId: creemIds.subscriptionId,
      creemProductId: decision.productId ?? undefined,
      creemEventId: event.id,
      creemUpdatedAt: new Date().toISOString(),
    },
  );

  if (update.ok === false) {
    console.error('[creem-webhook] clerk update failed', {
      userId: decision.userId,
      error: update.error,
      eventType: event.eventType,
    });
    return res.status(500).json({ error: update.error });
  }

  console.info('[creem-webhook] tier updated', {
    userId: decision.userId,
    tier: decision.tier,
    eventType: event.eventType,
    productId: decision.productId,
  });

  return res.status(200).json({
    received: true,
    action: decision.action,
    userId: decision.userId,
    tier: decision.tier,
  });
}