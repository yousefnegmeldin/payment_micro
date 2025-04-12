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

      if (payment && payment.user_booking_id) {
        const booking = await prisma.booking.findUnique({
          where: { id: payment.user_booking_id },
          select: {
            id: true,
            ride_id: true,
            user_id: true,
          },
        });

        if (booking) {
          await emitPaymentSucceededEvent({
            bookingId: booking.id,
            rideId: booking.ride_id,
            userId: booking.user_id,
          });
          console.log('Payment succeeded event emitted with booking data');
        } else {
          console.warn('Booking not found for payment');
        }
      }
    } catch (err) {
      console.error('Failed to handle payment completion:', err);
    }
  }

  res.status(200).json({ received: true });
}

module.exports = { handleStripeWebhook };
