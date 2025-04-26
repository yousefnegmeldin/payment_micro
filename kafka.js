const { Kafka } = require('kafkajs');
const { createCheckoutSession } = require('./stripe');

const kafka = new Kafka({
  clientId: 'stripe-service',
  brokers: process.env.KAFKA_BROKERS
    ? process.env.KAFKA_BROKERS.split(',')
    : ['localhost:9092'],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'stripe-service-group' });

async function connectKafkaProducer() {
  await producer.connect();
  console.log('Kafka producer connected (Stripe)');
}

async function emitPaymentSucceededEvent({ bookingId, rideId, userId,email }) {
  console.log("EMAIL IN EMIT PAYMENT SUSCCEEEEDED")
  console.log(email)
  try {
    console.log(`Emitting payment-succeeded event for booking ${bookingId}`);
    await producer.send({
      topic: 'payment-succeeded',
      messages: [
        {
          key: String(bookingId),
          value: JSON.stringify({ bookingId, rideId, userId,email }),
        },
      ],
    });
    console.log(`Successfully emitted payment-succeeded event for booking ${bookingId}`);
    
    // Also emit add-passenger-after-payment event
    console.log(`Emitting add-passenger-after-payment event for booking ${bookingId}`);
    await producer.send({
      topic: 'add-passenger-after-payment',
      messages: [
        {
          key: String(bookingId),
          value: JSON.stringify({ bookingId, rideId, userId }),
        },
      ],
    });
    console.log(`Successfully emitted add-passenger-after-payment event for booking ${bookingId}`);
  } catch (error) {
    console.error('Error emitting payment events:', error);
  }
}

async function startKafkaConsumer() {
  try {
    await consumer.connect();
    console.log('Kafka consumer connected (Stripe)');

    // Make sure you're subscribing to both topics
    await consumer.subscribe({ topic: 'start-payment', fromBeginning: false });
    await consumer.subscribe({ topic: 'booking-created', fromBeginning: false });
    
    console.log('Subscribed to topics: start-payment, booking-created');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) {
          console.log('Received empty message, skipping');
          return;
        }

        try {
          console.log(`Received message from topic ${topic}`);
          const data = JSON.parse(message.value.toString());
          console.log("Message data:", data);

          if (topic === 'start-payment') {
            // Handle start-payment event
            const { bookingId, price, rideId, userId, userEmail } = data;
            console.log(`Processing start-payment for booking ${bookingId} with price ${price}`);
            console.log(`TOPIC THAT HAS START PAYMENT ${userEmail}`)
            const checkoutUrl = await createCheckoutSession({ 
              price, 
              user_booking_id: bookingId,
              rideId,
              userId,
              email: userEmail 
            });
            console.log(`Created payment for booking ${bookingId}, checkout URL: ${checkoutUrl}`);
          } 
          else if (topic === 'booking-created') {
            // Handle booking-created event
            const { bookingId, price, rideId, userId, userEmail } = data;
            
            // If the message has different field names, extract them correctly
            const id = bookingId || data.id;
            const ride_id = rideId || data.ride_id;
            const user_id = userId || data.user_id;
            const payment_price = price || data.price;
            const email = userEmail || data.email || `user${user_id}@example.com`; // Extract email with fallback
            
            console.log(`Processing booking-created for booking ${id} with price ${payment_price} and email ${email}`);
            console.log(`TOPIC THAT HAS BOOKING CRAETED ${email}`)
            const checkoutUrl = await createCheckoutSession({ 
              price: payment_price, 
              user_booking_id: id,
              rideId: ride_id,
              userId: user_id,
              email 
            });
            console.log(`Created payment for new booking ${id}, checkout URL: ${checkoutUrl}`);
          }
        } catch (error) {
          console.error('Error processing Kafka message:', error);
        }
      },
    });
  } catch (error) {
    console.error('Error starting Kafka consumer:', error);
  }
}

module.exports = {
  connectKafkaProducer,
  startKafkaConsumer,
  emitPaymentSucceededEvent,
  producer, // Export the producer for use in webhook.js
};