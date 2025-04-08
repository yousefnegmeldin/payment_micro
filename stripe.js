const { prisma } = require('./db');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const APP_URL = "http://localhost:3000";

async function createCheckoutSession({ price, user_booking_id }) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Ride Booking',
        },
        unit_amount: price * 100, // price in cents
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${APP_URL}/success`,
    cancel_url: `${APP_URL}/cancel`,
  });

  await prisma.payments.create({
    data: {
      price: price,
      stripe_checkout_session_id: session.id,
      user_booking_id: user_booking_id,
      status: 'pending',
    },
  });

  return session.url;
}

module.exports = { createCheckoutSession };