require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { prisma } = require('./db');
const { emitPaymentSucceededEvent } = require('./kafka');

async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      await prisma.payments.updateMany({
        where: { stripe_checkout_session_id: session.id },
        data: { status: 'succeeded' },
      });

      const payment = await prisma.payments.findFirst({
        where: { stripe_checkout_session_id: session.id },
      });

      if (payment){
        await emitPaymentSucceededEvent({
          bookingId: payment.user_booking_id,
          rideId:  payment.ride_id,
          userId: payment.user_id
        })
        console.log('Payment succeeded event emitted with booking data');
      }
    } catch (err) {
      console.error('Failed to handle payment completion:', err);
    }
  }

  res.status(200).json({ received: true });
}

module.exports = { handleStripeWebhook };
