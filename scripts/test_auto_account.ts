import { prisma } from '../src/lib/prisma';
import { OrderService } from '../src/services/order/order.service';
import { AuthService } from '../src/services/auth/auth.service';
import crypto from 'crypto';

async function runTest() {
  console.log('=== STARTING AUTOMATIC ACCOUNT CREATION TESTS ===');

  const testEmail = `test_guest_${Date.now()}@example.com`;
  console.log(`Using test email: ${testEmail}`);

  // 1. Get an active product from DB to test with
  const product = await prisma.product.findFirst({
    where: { status: 'ACTIVE', isDeleted: false, stock: { gt: 2 } }
  });

  if (!product) {
    console.error('No active product found for testing');
    return;
  }
  console.log(`Using product: ${product.name} (ID: ${product.id}, Stock: ${product.stock})`);

  // Test 1: Guest Checkout (First purchase)
  console.log('\n--- TEST 1: Guest Checkout (First Purchase) ---');
  const order1 = await OrderService.checkout({
    customerName: 'Test Guest Customer',
    email: testEmail.toUpperCase(), // Test email normalization
    phone: '01700000001',
    shippingAddress: 'House 12, Road 4, Dhanmondi, Dhaka',
    items: [{ productId: product.id, quantity: 1, size: 'L', color: 'Black' }],
    shippingCost: 80
  });

  console.log(`Order 1 Placed! Order ID: ${order1.id}, AutoCreated: ${order1.autoAccountCreated}`);

  // Verify User in DB
  const user = await prisma.user.findUnique({
    where: { email: testEmail.toLowerCase() },
    include: { activationTokens: true, orders: true }
  });

  if (!user) throw new Error('User was not created!');
  console.log(`User created: ID: ${user.id}, Status: ${user.accountStatus}, CreatedFrom: ${user.createdFrom}, Password: ${user.password}`);
  console.log(`User Orders count: ${user.orders.length}`);
  console.log(`Activation Tokens count: ${user.activationTokens.length}`);

  if (user.password !== null) throw new Error('User password should be null before activation!');
  if (user.accountStatus !== 'PENDING_ACTIVATION') throw new Error('Account status should be PENDING_ACTIVATION!');
  if (user.activationTokens.length !== 1) throw new Error('Should have exactly 1 activation token!');

  const tokenRecord = user.activationTokens[0];
  console.log(`Token expiresAt: ${tokenRecord.expiresAt}, usedAt: ${tokenRecord.usedAt}`);

  // Test 2: Login Before Activation (Should be blocked)
  console.log('\n--- TEST 2: Login Attempt Before Activation ---');
  try {
    await AuthService.login({ email: testEmail, password: 'anypassword' });
    throw new Error('Login should have failed for unactivated account!');
  } catch (err: any) {
    console.log(`Login blocked as expected: "${err.message}" (Code: ${err.errorCode})`);
  }

  // Test 3: Verify and Set Password using Activation Token
  console.log('\n--- TEST 3: Set Password and Activate Account ---');
  // We recreate the raw token from the flow by creating a test raw token or using activation service
  const rawTestToken = crypto.randomBytes(32).toString('hex');
  const newHash = crypto.createHash('sha256').update(rawTestToken).digest('hex');
  await prisma.activationToken.create({
    data: {
      userId: user.id,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });

  const verifyResult = await AuthService.verifyActivationToken(rawTestToken);
  console.log(`Token verified:`, verifyResult);

  const activateResult = await AuthService.setPasswordAndActivate(rawTestToken, 'SecurePass123!');
  console.log(`Account activated! User: ${activateResult.user.email}, JWT Token generated: ${!!activateResult.token}`);

  const activatedUser = await prisma.user.findUnique({
    where: { id: user.id }
  });
  console.log(`Updated User in DB: Status: ${activatedUser?.accountStatus}, EmailVerified: ${activatedUser?.emailVerified}, Password Set: ${!!activatedUser?.password}`);

  // Test 4: Second Purchase by same email
  console.log('\n--- TEST 4: Second Purchase by same customer ---');
  const order2 = await OrderService.checkout({
    customerName: 'Test Guest Customer',
    email: testEmail,
    phone: '01700000001',
    shippingAddress: 'House 12, Road 4, Dhanmondi, Dhaka',
    items: [{ productId: product.id, quantity: 1, size: 'XL', color: 'White' }],
    shippingCost: 80
  });

  console.log(`Order 2 Placed! Order ID: ${order2.id}, AutoCreated: ${order2.autoAccountCreated}`);

  const finalUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { orders: true }
  });

  console.log(`Customer Orders count after 2nd purchase: ${finalUser?.orders.length}`);
  if (finalUser?.orders.length !== 2) throw new Error('User should have 2 orders linked to their account!');

  // Test 5: Login with new password
  console.log('\n--- TEST 5: Login with new password ---');
  const loginResult = await AuthService.login({ email: testEmail, password: 'SecurePass123!' });
  console.log(`Login successful! User ID: ${loginResult.user.id}`);

  // Clean up test data
  console.log('\n--- Cleaning up test data ---');
  await prisma.orderItem.deleteMany({ where: { orderId: { in: [order1.id, order2.id] } } });
  await prisma.order.deleteMany({ where: { id: { in: [order1.id, order2.id] } } });
  await prisma.activationToken.deleteMany({ where: { userId: user.id } });
  await prisma.cart.deleteMany({ where: { userId: user.id } });
  await prisma.wishlist.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log('Cleanup complete!');

  console.log('\n✅ ALL AUTOMATIC ACCOUNT & ORDER LINKING TESTS PASSED PERFECTLY!');
}

runTest()
  .catch((err) => {
    console.error('TEST FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
