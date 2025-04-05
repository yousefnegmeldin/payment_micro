CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  price INT,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  user_booking_id INT,
  status TEXT CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
