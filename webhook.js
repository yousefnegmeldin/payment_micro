require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { prisma } = require('./db');
const { emitPaymentSucceededEvent, producer } = require('./kafka');

async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // For testing without signature verification
    if (!sig && process.env.NODE_ENV !== 'production') {
      // Allow webhook testing without signature in development
      event = { type: req.body.type, data: { object: req.body.data.object } };
      console.log('⚠️ Running in test mode - bypassing signature verification');
    } else {
      // Normal signature verification
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }
    
    console.log(`Received webhook event: ${event.type}`);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Processing checkout.session.completed event:', session.id);

    try {
      // Update payment status
      await prisma.payments.updateMany({
        where: { stripe_checkout_session_id: session.id },
        data: { status: 'succeeded' },
      });

      const payment = await prisma.payments.findFirst({
        where: { stripe_checkout_session_id: session.id },
      });

      if (payment) {
        console.log(`Found payment record for session ${session.id}:`, {
          bookingId: payment.user_booking_id,
          rideId: payment.ride_id,
          userId: payment.user_id
        });

        // Emit payment succeeded event
        await emitPaymentSucceededEvent({
          bookingId: payment.user_booking_id,
          rideId: payment.ride_id,
          userId: payment.user_id,
          email: payment.user_email,
        });
      } else {
        console.error('No payment record found for session:', session.id);
      }
    } catch (err) {
      console.error('Failed to handle payment completion:', err);
    }
  }

  res.status(200).json({ received: true });
}

module.exports = { handleStripeWebhook };