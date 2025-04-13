const express = require('express');
const bodyParser = require('body-parser');
const { handleStripeWebhook } = require('./webhook');
const { createCheckoutSession, isSuccessfulPayment } = require('./stripe');
const { connectKafkaProducer, startKafkaConsumer } = require('./kafka');
const { prisma } = require('./db');
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

app.get('/:id/payment-url/', async (req,res)=> {
  const existingPayment = await prisma.payments.findUnique({
    where: { user_booking_id: parseInt(req.params.id, 10) },
  });
  if(!existingPayment){
    return res.json({checkoutUrl:null})
  }
  return res.json({checkoutUrl: existingPayment.checkout_url});
})

const PORT = process.env.PORT || 4002;

async function start() {
  await connectKafkaProducer();
  await startKafkaConsumer(); 
  app.listen(PORT, () => {
    console.log(`Stripe microservice running on port ${PORT}`);
  });
}

start();
