import { PrismaClient, Role, CategoryStatus, ProductStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  // Delete in reverse dependency order
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding users...');
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin123', salt);
  const customerPassword = await bcrypt.hash('Customer123', salt);

  await prisma.user.create({
    data: {
      name: 'ShopNest Admin',
      email: 'admin@shopnest.com',
      password: adminPassword,
      phone: '01711111111',
      address: 'Dhaka, Bangladesh',
      role: Role.ADMIN
    }
  });

  const customers = [];
  for (let i = 1; i <= 4; i++) {
    const cust = await prisma.user.create({
      data: {
        name: `Customer Test ${i}`,
        email: `customer${i}@shopnest.com`,
        password: customerPassword,
        phone: `0172222222${i}`,
        address: `Street ${i}, Sector 4, Uttara, Dhaka`,
        role: Role.CUSTOMER
      }
    });
    customers.push(cust);

    // Create a cart and wishlist for each customer
    await prisma.cart.create({
      data: { userId: cust.id }
    });
    await prisma.wishlist.create({
      data: { userId: cust.id }
    });
  }

  console.log('Seeding categories...');
  const categoriesData = [
    { name: 'Electronics', slug: 'electronics', description: 'Gadgets, phones, laptops and more', image: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?q=80&w=300' },
    { name: 'Clothing & Apparel', slug: 'clothing-apparel', description: 'Trendy mens and womens fashion', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=300' },
    { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Furniture, decor and kitchen items', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=300' },
    { name: 'Books & Stationery', slug: 'books-stationery', description: 'Academic, novels and writing supplies', image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=300' },
    { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', description: 'Cosmetics, skincare and fragrance', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=300' },
    { name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Fitness, camping and outdoor gear', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=300' }
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const createdCat = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image: cat.image,
        status: CategoryStatus.ACTIVE
      }
    });
    categories.push(createdCat);
  }

  console.log('Seeding products...');
  const productsData = [
    // Electronics
    { name: 'iPhone 15 Pro Max', slug: 'iphone-15-pro-max', price: 1399, discountPrice: 1299, stock: 15, sku: 'ELEC-IPH15PM-01', image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=400', categoryIdx: 0 },
    { name: 'MacBook Air M2', slug: 'macbook-air-m2', price: 1099, discountPrice: 999, stock: 8, sku: 'ELEC-MBAIRM2-02', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=400', categoryIdx: 0 },
    { name: 'Sony WH-1000XM5 Headphones', slug: 'sony-wh-1000xm5', price: 399, discountPrice: 349, stock: 25, sku: 'ELEC-SONYXM5-03', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400', categoryIdx: 0 },
    { name: 'Samsung Galaxy Watch 6', slug: 'samsung-galaxy-watch-6', price: 299, discountPrice: null, stock: 12, sku: 'ELEC-SGWATCH6-04', image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=80&w=400', categoryIdx: 0 },

    // Clothing
    { name: 'Slim Fit Cotton Denim Shirt', slug: 'slim-fit-cotton-denim-shirt', price: 49, discountPrice: 39, stock: 40, sku: 'CLOTH-SHIRT-01', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=400', categoryIdx: 1 },
    { name: 'Classic Leather Jacket', slug: 'classic-leather-jacket', price: 199, discountPrice: 149, stock: 10, sku: 'CLOTH-JACKET-02', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=400', categoryIdx: 1 },
    { name: 'Running Sport Sneakers', slug: 'running-sport-sneakers', price: 89, discountPrice: null, stock: 30, sku: 'CLOTH-SNEAK-03', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400', categoryIdx: 1 },
    { name: 'Unisex Summer Cotton Hoody', slug: 'unisex-summer-cotton-hoody', price: 59, discountPrice: 45, stock: 22, sku: 'CLOTH-HOODY-04', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=400', categoryIdx: 1 },

    // Home & Kitchen
    { name: 'Ergonomic Office Chair', slug: 'ergonomic-office-chair', price: 249, discountPrice: 219, stock: 10, sku: 'HOME-OCHAIR-01', image: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?q=80&w=400', categoryIdx: 2 },
    { name: 'Stainless Steel Air Fryer', slug: 'stainless-steel-air-fryer', price: 129, discountPrice: 99, stock: 18, sku: 'HOME-AFRYER-02', image: 'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?q=80&w=400', categoryIdx: 2 },
    { name: 'LED Smart Desk Lamp', slug: 'led-smart-desk-lamp', price: 39, discountPrice: null, stock: 50, sku: 'HOME-LAMP-03', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=400', categoryIdx: 2 },
    { name: 'Non-Stick Ceramic Cookware Set', slug: 'non-stick-ceramic-cookware-set', price: 180, discountPrice: 159, stock: 7, sku: 'HOME-COOK-04', image: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?q=80&w=400', categoryIdx: 2 },

    // Books & Stationery
    { name: 'Atomic Habits (Paperback)', slug: 'atomic-habits-paperback', price: 18, discountPrice: 15, stock: 100, sku: 'BOOK-HABITS-01', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400', categoryIdx: 3 },
    { name: 'The Psychology of Money', slug: 'the-psychology-of-money', price: 20, discountPrice: null, stock: 80, sku: 'BOOK-PSYCH-02', image: 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?q=80&w=400', categoryIdx: 3 },
    { name: 'A5 Leather Grid Notebook', slug: 'a5-leather-grid-notebook', price: 12, discountPrice: 9, stock: 120, sku: 'STAT-NOTEBOOK-03', image: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?q=80&w=400', categoryIdx: 3 },

    // Beauty
    { name: 'Hydrating Face Moisturizer', slug: 'hydrating-face-moisturizer', price: 25, discountPrice: 22, stock: 35, sku: 'BEAU-MOIST-01', image: 'https://images.unsplash.com/photo-1608248597481-496100c8c836?q=80&w=400', categoryIdx: 4 },
    { name: 'Matte Red Lipstick Set', slug: 'matte-red-lipstick-set', price: 35, discountPrice: null, stock: 40, sku: 'BEAU-LIPSTICK-02', image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=400', categoryIdx: 4 },
    { name: 'Organic Argan Hair Oil', slug: 'organic-argan-hair-oil', price: 19, discountPrice: 15, stock: 60, sku: 'BEAU-HAIROIL-03', image: 'https://images.unsplash.com/photo-1608248597481-496100c8c836?q=80&w=400', categoryIdx: 4 },

    // Sports
    { name: 'Adjustable Dumbbell Set (20kg)', slug: 'adjustable-dumbbell-set-20kg', price: 110, discountPrice: 99, stock: 14, sku: 'SPOR-DUMB-01', image: 'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?q=80&w=400', categoryIdx: 5 },
    { name: 'Waterproof Camping Tent', slug: 'waterproof-camping-tent', price: 150, discountPrice: 129, stock: 6, sku: 'SPOR-TENT-02', image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=400', categoryIdx: 5 },
    { name: 'Anti-Slip Yoga Mat', slug: 'anti-slip-yoga-mat', price: 28, discountPrice: null, stock: 45, sku: 'SPOR-YOGAMAT-03', image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?q=80&w=400', categoryIdx: 5 }
  ];

  const products = [];
  for (const prod of productsData) {
    const createdProd = await prisma.product.create({
      data: {
        name: prod.name,
        slug: prod.slug,
        price: prod.price,
        discountPrice: prod.discountPrice,
        stock: prod.stock,
        sku: prod.sku,
        image: prod.image,
        categoryId: categories[prod.categoryIdx].id,
        status: ProductStatus.ACTIVE
      }
    });
    products.push(createdProd);
  }

  console.log('Seeding reviews...');
  const reviewsData = [
    { rating: 5, comment: 'Absolutely amazing speed and display. Battery life is fantastic.', userIdx: 0, productIdx: 0 },
    { rating: 4, comment: 'Great phone, but the price is slightly steep.', userIdx: 1, productIdx: 0 },
    { rating: 5, comment: 'Extremely lightweight and handles coding work smoothly.', userIdx: 2, productIdx: 1 },
    { rating: 5, comment: 'Active Noise Cancelling is top tier. Fits comfortably.', userIdx: 0, productIdx: 2 },
    { rating: 3, comment: 'Good sound quality but Bluetooth lags sometimes.', userIdx: 1, productIdx: 2 },
    { rating: 4, comment: 'Denim is thick and high quality. Fitting is perfect.', userIdx: 2, productIdx: 4 },
    { rating: 5, comment: 'Amazing book! Changed my daily perspective completely.', userIdx: 3, productIdx: 12 }
  ];

  for (const rev of reviewsData) {
    await prisma.review.create({
      data: {
        rating: rev.rating,
        comment: rev.comment,
        userId: customers[rev.userIdx].id,
        productId: products[rev.productIdx].id
      }
    });
  }

  console.log('Seeding orders...');
  // Customer 1 Order
  const order1 = await prisma.order.create({
    data: {
      userId: customers[0].id,
      totalAmount: 1338, // 1 iPhone 15 Pro Max (1299 discount) + 1 denim shirt (39 discount)
      shippingAddress: 'Flat 4B, Road 12, Banani, Dhaka',
      phone: '01899999999',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID
    }
  });

  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      productId: products[0].id,
      productName: products[0].name,
      price: 1299,
      quantity: 1,
      subtotal: 1299
    }
  });

  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      productId: products[4].id,
      productName: products[4].name,
      price: 39,
      quantity: 1,
      subtotal: 39
    }
  });

  // Customer 2 Order
  const order2 = await prisma.order.create({
    data: {
      userId: customers[1].id,
      totalAmount: 349, // 1 Headphones
      shippingAddress: 'House 56, Sector 10, Uttara, Dhaka',
      phone: '01888888888',
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID
    }
  });

  await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      productId: products[2].id,
      productName: products[2].name,
      price: 349,
      quantity: 1,
      subtotal: 349
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
