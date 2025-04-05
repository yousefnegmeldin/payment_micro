const express = require('express');
const bodyParser = require('body-parser');
const { createCheckoutSession } = require('./stripe');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

app.post('/create-payment', async (req, res) => {
  const { price, user_booking_id } = req.body;

  if (!price || !user_booking_id) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const checkoutUrl = await createCheckoutSession({ price, user_booking_id });
    res.json({ url: checkoutUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Stripe microservice running on port ${PORT}`);
});
