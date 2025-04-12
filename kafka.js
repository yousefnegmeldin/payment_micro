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

async function emitPaymentSucceededEvent({ bookingId, rideId, userId }) {
  await producer.send({
    topic: 'payment-succeeded',
    messages: [
      {
        key: String(bookingId),
        value: JSON.stringify({ bookingId, rideId, userId }),
      },
    ],
  });
}

async function emitPaymentUrlCreatedEvent({bookingId, checkoutUrl}) {
  await producer.send({
    topic: 'payment-url-created',
    messages: [
      {
        key: String(bookingId),
        value: JSON.stringify({bookingId,checkoutUrl})
      },
    ],
  });
}

async function startKafkaConsumer() {
  await consumer.connect();
  console.log('Kafka consumer connected (Stripe)');

  await consumer.subscribe({ topic: 'start-payment', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value) return;

      try {
        const { bookingId, price } = JSON.parse(message.value.toString());

        if (!bookingId || !price) {
          console.warn('Invalid message received on start-payment:', message.value.toString());
          return;
        }

        await createCheckoutSession({ price, user_booking_id: bookingId });
        console.log(`Checkout session created for booking ${bookingId}`);
      } catch (err) {
        console.error('Error handling start-payment event:', err);
      }
    },
  });
}

module.exports = {
  connectKafkaProducer,
  startKafkaConsumer,
  emitPaymentUrlCreatedEvent,
  emitPaymentSucceededEvent,
};
