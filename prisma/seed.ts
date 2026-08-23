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
      name: 'OnWear Admin',
      email: 'admin@onwear.com',
      password: adminPassword,
      phone: '01711111111',
      address: 'Dhaka, Bangladesh',
      role: Role.admin
    }
  });

  const customers = [];
  for (let i = 1; i <= 4; i++) {
    const cust = await prisma.user.create({
      data: {
        name: `Customer Test ${i}`,
        email: `customer${i}@onwear.com`,
        password: customerPassword,
        phone: `0172222222${i}`,
        address: `Street ${i}, Sector 4, Uttara, Dhaka`,
        role: Role.customer
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

  console.log('Seeding clothing categories...');
  const categoriesData = [
    { name: 'Shirt', slug: 'shirt', description: 'Premium cotton and linen shirts', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=300' },
    { name: 'Pant', slug: 'pant', description: 'Tailored trousers, chinos and joggers', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=300' },
    { name: 'T-Shirt', slug: 't-shirt', description: 'Everyday comfortable tee collection', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=300' },
    { name: 'Cap', slug: 'cap', description: 'Minimalist dad hats and baseball caps', image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=300' },
    { name: 'Sandal', slug: 'sandal', description: 'Genuine leather slides and footbed sandals', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=300' }
  ];

  const categoriesMap: Record<string, any> = {};
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
    categoriesMap[cat.slug] = createdCat;
  }

  // Create subcategories under Pant
  console.log('Seeding subcategories...');
  const subcategoriesData = [
    { name: 'Denim', slug: 'denim', description: 'Classic jeans and premium denim jackets', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=300', parentSlug: 'pant' },
    { name: 'Chino', slug: 'chino', description: 'Chino pants and trousers', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=300', parentSlug: 'pant' },
    { name: 'Cargo', slug: 'cargo', description: 'Multi-pocket cargo pants', image: 'https://images.unsplash.com/photo-1517423568366-8b83523034fd?q=80&w=300', parentSlug: 'pant' }
  ];

  for (const sub of subcategoriesData) {
    const parent = categoriesMap[sub.parentSlug];
    const createdSub = await prisma.category.create({
      data: {
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        image: sub.image,
        parentId: parent.id,
        status: CategoryStatus.ACTIVE
      }
    });
    categoriesMap[sub.slug] = createdSub;
  }

  console.log('Seeding products...');
    // Shirts
    { name: "Men's Slim Fit Oxford Cotton Shirt", slug: 'mens-slim-fit-oxford-cotton-shirt', price: 49, discountPrice: 39, stock: 15, sku: 'CLOTH-SHIRT-01', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=400', image2: 'https://images.unsplash.com/photo-1589310243389-96a5483213a8?q=80&w=400', categorySlug: 'shirt' },
    { name: "Men's Classic Linen Button-Down Shirt", slug: 'mens-classic-linen-button-down-shirt', price: 55, discountPrice: 45, stock: 20, sku: 'CLOTH-SHIRT-02', image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=400', image2: 'https://images.unsplash.com/photo-1621072156002-e2fcc103e86e?q=80&w=400', categorySlug: 'shirt' },
    { name: "Men's Vintage Check Flannel Shirt", slug: 'mens-vintage-check-flannel-shirt', price: 45, discountPrice: null, stock: 12, sku: 'CLOTH-SHIRT-03', image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=400', image2: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?q=80&w=400', categorySlug: 'shirt' },

    // Pants / Subcategories
    { name: "Men's Chino Slim Fit Stretch Pants", slug: 'mens-chino-slim-fit-stretch-pants', price: 59, discountPrice: 49, stock: 18, sku: 'CLOTH-PANTS-01', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=400', image2: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=400', categorySlug: 'chino' },
    { name: "Men's Relaxed Cargo Jogger Pants", slug: 'mens-relaxed-cargo-jogger-pants', price: 49, discountPrice: null, stock: 25, sku: 'CLOTH-PANTS-02', image: 'https://images.unsplash.com/photo-1517423568366-8b83523034fd?q=80&w=400', image2: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400', categorySlug: 'cargo' },
    { name: "Men's Tailored Slim Dress Trousers", slug: 'mens-tailored-slim-dress-trousers', price: 79, discountPrice: 69, stock: 10, sku: 'CLOTH-PANTS-03', image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=400', image2: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400', categorySlug: 'pant' },

    // T-Shirts
    { name: "Men's Organic Cotton Crewneck T-Shirt", slug: 'mens-organic-cotton-crewneck-t-shirt', price: 24, discountPrice: 19, stock: 50, sku: 'CLOTH-TEE-01', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=400', image2: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=400', categorySlug: 't-shirt' },
    { name: "Men's Heavyweight Graphic Printed Tee", slug: 'mens-heavyweight-graphic-printed-tee', price: 29, discountPrice: null, stock: 35, sku: 'CLOTH-TEE-02', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=400', image2: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=400', categorySlug: 't-shirt' },
    { name: "Men's Classic V-Neck Everyday Tee", slug: 'mens-classic-v-neck-everyday-tee', price: 22, discountPrice: null, stock: 40, sku: 'CLOTH-TEE-03', image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=400', image2: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=400', categorySlug: 't-shirt' },

    // Denim
    { name: "Men's Classic Straight Fit Denim Jeans", slug: 'mens-classic-straight-fit-denim-jeans', price: 79, discountPrice: 64, stock: 30, sku: 'CLOTH-DENIM-01', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=400', image2: 'https://images.unsplash.com/photo-1582552938357-32b906df43c3?q=80&w=400', categorySlug: 'denim' },
    { name: "Men's Distressed Denim Rider Jacket", slug: 'mens-distressed-denim-rider-jacket', price: 99, discountPrice: 89, stock: 15, sku: 'CLOTH-DENIM-02', image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=400', image2: 'https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?q=80&w=400', categorySlug: 'denim' },
    { name: "Men's Denim Indigo Workwear Overshirt", slug: 'mens-denim-indigo-workwear-overshirt', price: 69, discountPrice: null, stock: 22, sku: 'CLOTH-DENIM-03', image: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=400', image2: 'https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?q=80&w=400', categorySlug: 'denim' },

    // Caps
    { name: "Men's Premium Embroidered Baseball Cap", slug: 'mens-premium-embroidered-baseball-cap', price: 25, discountPrice: 19, stock: 40, sku: 'CLOTH-CAP-01', image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=400', image2: 'https://images.unsplash.com/photo-1534215754734-18e55d13e346?q=80&w=400', categorySlug: 'cap' },
    { name: "Men's Minimalist Solid Cotton Dad Hat", slug: 'mens-minimalist-solid-cotton-dad-hat', price: 22, discountPrice: null, stock: 50, sku: 'CLOTH-CAP-02', image: 'https://images.unsplash.com/photo-1534215754734-18e55d13e346?q=80&w=400', image2: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=400', categorySlug: 'cap' },

    // Sandals
    { name: "Men's Genuine Leather Slide Sandals", slug: 'mens-genuine-leather-slide-sandals', price: 45, discountPrice: 39, stock: 25, sku: 'CLOTH-SANDAL-01', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=400', image2: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=400', categorySlug: 'sandal' },
    { name: "Men's Everyday Cork Footbed Sandals", slug: 'mens-everyday-cork-footbed-sandals', price: 49, discountPrice: null, stock: 35, sku: 'CLOTH-SANDAL-02', image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=400', image2: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=400', categorySlug: 'sandal' }
  ];

  const products = [];
  for (const prod of productsData) {
    const category = categoriesMap[prod.categorySlug];
    const createdProd = await prisma.product.create({
      data: {
        name: prod.name,
        slug: prod.slug,
        price: prod.price,
        discountPrice: prod.discountPrice,
        stock: prod.stock,
        sku: prod.sku,
        image: prod.image,
        image2: prod.image2,
        categoryId: category.id,
        status: ProductStatus.ACTIVE
      }
    });
    products.push(createdProd);
  }

  console.log('Seeding reviews...');
  const reviewsData = [
    { rating: 5, comment: 'Very premium cotton fabric, fitting is excellent.', userIdx: 0, productIdx: 0 },
    { rating: 4, comment: 'Perfect shirt for hot summer days. Highly recommend it.', userIdx: 1, productIdx: 1 },
    { rating: 5, comment: 'The material is comfortable and color is rich.', userIdx: 2, productIdx: 6 }
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
      totalAmount: 58, // 1 Organic T-Shirt (19 discount) + 1 Slide Sandals (39 discount)
      shippingAddress: 'Flat 4B, Road 12, Banani, Dhaka',
      phone: '01899999999',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID
    }
  });

  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      productId: products[6].id,
      productName: products[6].name,
      price: 19,
      quantity: 1,
      subtotal: 19
    }
  });

  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      productId: products[14].id,
      productName: products[14].name,
      price: 39,
      quantity: 1,
      subtotal: 39
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
