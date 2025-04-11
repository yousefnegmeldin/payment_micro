const express = require('express');
const bodyParser = require('body-parser');
const { handleStripeWebhook } = require('./webhook');
const { createCheckoutSession, isSuccessfulPayment } = require('./stripe');
const { connectKafkaProducer } = require('./kafka');
require('dotenv').config();

const app = express();
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), handleStripeWebhook);
app.use(express.json());

app.post('/create-payment', async (req, res) => {
  const { price, user_booking_id } = req.body;

  if (!price || !user_booking_id) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const checkoutUrl = await createCheckoutSession({ price, user_booking_id });
    const successValue = await isSuccessfulPayment(user_booking_id);
    res.json({ url: checkoutUrl, success: successValue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

const PORT = process.env.PORT || 4002;

async function start() {
  await connectKafkaProducer();
  app.listen(PORT, () => {
    console.log(`Stripe microservice running on port ${PORT}`);
  });
}

start();
