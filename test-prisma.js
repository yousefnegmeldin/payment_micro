const { prisma } = require('./db');

async function testPrisma() {
  try {
    // Test database connection
    console.log('Testing Prisma connection...');

    // Example: Fetch all payments (if the table exists and has data)
    const payments = await prisma.payments.findMany();
    console.log('Payments:', payments);

    // Example: Create a test payments
    const testPayment = await prisma.payments.create({
      data: {
        price: 1000,
        stripe_checkout_session_id: 'test_session_id', 
        user_booking_id: 1,
        status: 'pending',
      },
    });
    console.log('Test payments Created:', testPayment);

    // Clean up: Delete the test payments
    await prisma.payments.delete({ where: { id: testPayment.id } });
    console.log('Test payments Deleted');

    console.log('Prisma is working correctly!');
  } catch (error) {
    console.error('Error testing Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma();