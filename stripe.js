require('dotenv').config(); 
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('./db');
const APP_URL = "http://localhost:3000"
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

  await db.query(`
    INSERT INTO payments (price, stripe_checkout_session_id, user_booking_id, status)
    VALUES ($1, $2, $3, 'pending')
  `, [price, session.id, user_booking_id]);

  return session.url;
}

module.exports = { createCheckoutSession };
