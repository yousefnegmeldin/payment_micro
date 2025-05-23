const express = require('express');
const bodyParser = require('body-parser');
const { handleStripeWebhook } = require('./webhook');
const { createCheckoutSession, isSuccessfulPayment } = require('./stripe');
const { connectKafkaProducer, startKafkaConsumer } = require('./kafka');
const { prisma } = require('./db');
const cors = require("cors")
const { isAdmin } = require('./auth');
require('dotenv').config();

const app = express();
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), handleStripeWebhook);
app.use(express.json());
const corsOptions = {
  origin: '*', // Allow all origins (you can restrict this to specific domains)
  methods: ['GET', 'POST'], // Specify allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Specify allowed headers
};
app.use(cors(corsOptions))

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

app.get('/admin/payments', async (req, res) => {
  const token = req.headers.authorization.replace('Bearer ', '');
  if (!token || !(await isAdmin(token))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  // This route should be protected with admin authentication in a real-world scenario
  try {
    const payments = await prisma.payments.findMany();
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

const PORT = process.env.PORT || 4002;

async function start() {
  await connectKafkaProducer();
  await startKafkaConsumer(); 
  app.listen(PORT, () => {
    console.log(`Stripe microservice running on port ${PORT}`);
  });
}

start();
