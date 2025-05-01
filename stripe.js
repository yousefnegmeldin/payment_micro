const { prisma } = require('./db');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const APP_URL = "http://localhost:3000";


async function createCheckoutSession({ price, user_booking_id, rideId, userId, email}) {
  const existingPayment = await prisma.payments.findUnique({
    where: { user_booking_id },
  });

  if (existingPayment) {
    return existingPayment.checkout_url; // ✅ use stored full URL
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Ride Booking',
        },
        unit_amount: price * 100,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${APP_URL}/success?rideId=${rideId}&bookingId=${user_booking_id}`,
    cancel_url: `${APP_URL}/cancel`,
  });

  await prisma.payments.create({
    data: {
      price,
      stripe_checkout_session_id: session.id,
      checkout_url: session.url,
      user_booking_id,
      ride_id: rideId,
      user_id: userId,
      user_email: email,
      status: 'pending',
    },
  });

  return session.url;
}

async function isSuccessfulPayment(user_booking_id) {
  const existingPayment = await prisma.payments.findUnique({
    where: { user_booking_id },
  });
  return existingPayment.status == "succeeded"
}

module.exports = { createCheckoutSession, isSuccessfulPayment };