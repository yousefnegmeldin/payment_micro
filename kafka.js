const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'stripe-service',
  brokers: process.env.KAFKA_BROKERS
    ? process.env.KAFKA_BROKERS.split(',')
    : ['localhost:9092'],
});

const producer = kafka.producer();

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

module.exports = {
  connectKafkaProducer,
  emitPaymentSucceededEvent,
};
