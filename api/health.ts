import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Deployment smoke check — confirms API routes and billing env are wired. */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    service: 'shaderlumen',
    billing: {
      creemWebhookSecret: Boolean(process.env.CREEM_WEBHOOK_SECRET),
      creemProProducts: Boolean(process.env.CREEM_PRODUCT_PRO_IDS),
      clerkSecret: Boolean(process.env.CLERK_SECRET_KEY),
    },
    ai: {
      openai:
        Boolean(process.env.VITE_OPENAI_API_KEY)
        || Boolean(process.env.OPENAI_API_KEY),
      model: process.env.VITE_OPENAI_MODEL || 'gpt-5.4-mini',
    },
    client: {
      creemCheckoutPro: Boolean(process.env.VITE_CREEM_CHECKOUT_PRO_URL),
      clerkPublishable: Boolean(process.env.VITE_CLERK_PUBLISHABLE_KEY),
      demoBilling:
        process.env.DEMO_BILLING === 'true'
        || process.env.VITE_DEMO_BILLING === 'true',
    },
  });
}