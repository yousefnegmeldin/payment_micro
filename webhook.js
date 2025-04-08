require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { prisma } = require('./db');

async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      await prisma.payments.updateMany({
        where: { stripe_checkout_session_id: session.id },
        data: { status: 'succeeded' },
      });
      console.log('✅ Payment marked as success:', session.id);
    } catch (err) {
      console.error('❌ Failed to update payment:', err);
    }
  }

  res.status(200).json({ received: true });
}

module.exports = { handleStripeWebhook };
