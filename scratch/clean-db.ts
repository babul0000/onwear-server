import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING DATABASE RESTORE & CLEANUP ---');

  // Find garbage product ID(s)
  const garbageProducts = await prisma.product.findMany({
    where: {
      OR: [
        { id: 'e95ca2ad-ad64-4e85-83b9-7e290858f15b' },
        { name: 'hgjui' }
      ]
    },
    select: { id: true }
  });

  const garbageIds = garbageProducts.map(p => p.id);

  if (garbageIds.length > 0) {
    console.log(`Deleting dependent references for garbage product IDs: ${garbageIds.join(', ')}...`);
    
    // Delete in child tables first
    await prisma.wishlistItem.deleteMany({
      where: { productId: { in: garbageIds } }
    });
    await prisma.cartItem.deleteMany({
      where: { productId: { in: garbageIds } }
    });
    await prisma.review.deleteMany({
      where: { productId: { in: garbageIds } }
    });
    await prisma.orderItem.deleteMany({
      where: { productId: { in: garbageIds } }
    });

    console.log('Deleting garbage products...');
    await prisma.product.deleteMany({
      where: { id: { in: garbageIds } }
    });
  }

  // 2. Identify top level parent category 'Pant' (slug: 'pant')
  let pantParent = await prisma.category.findFirst({
    where: { slug: 'pant' }
  });

  if (!pantParent) {
    // If not found, look for 'Pants' and rename it to 'Pant'
    const pantsCat = await prisma.category.findFirst({
      where: { slug: 'pants' }
    });
    if (pantsCat) {
      console.log('Renaming Pants to Pant...');
      pantParent = await prisma.category.update({
        where: { id: pantsCat.id },
        data: { name: 'Pant', slug: 'pant' }
      });
    } else {
      console.log('Creating Pant category...');
      pantParent = await prisma.category.create({
        data: {
          name: 'Pant',
          slug: 'pant',
          description: 'Premium trousers, chinos, cargo and denim'
        }
      });
    }
  } else {
    // Make sure name is capitalized
    pantParent = await prisma.category.update({
      where: { id: pantParent.id },
      data: { name: 'Pant' }
    });
  }
  console.log(`Pant category ID: ${pantParent.id}`);

  // 3. Ensure subcategories exist under Pant
  // A. Chino
  let chinoSub = await prisma.category.findFirst({ where: { slug: 'chino' } });
  if (!chinoSub) {
    console.log('Creating Chino subcategory...');
    chinoSub = await prisma.category.create({
      data: {
        name: 'Chino',
        slug: 'chino',
        description: 'Chino pants and trousers',
        parentId: pantParent.id
      }
    });
  } else {
    await prisma.category.update({
      where: { id: chinoSub.id },
      data: { parentId: pantParent.id }
    });
  }

  // B. Cargo
  let cargoSub = await prisma.category.findFirst({ where: { slug: 'cargo' } });
  if (!cargoSub) {
    console.log('Creating Cargo subcategory...');
    cargoSub = await prisma.category.create({
      data: {
        name: 'Cargo',
        slug: 'cargo',
        description: 'Multi-pocket cargo pants',
        parentId: pantParent.id
      }
    });
  } else {
    await prisma.category.update({
      where: { id: cargoSub.id },
      data: { parentId: pantParent.id }
    });
  }

  // C. Denim (exists already, set its parent to Pant)
  const denimCat = await prisma.category.findFirst({ where: { slug: 'denim' } });
  if (denimCat) {
    console.log('Linking Denim under Pant parent...');
    await prisma.category.update({
      where: { id: denimCat.id },
      data: { parentId: pantParent.id }
    });
  }

  // 4. Migrate products under duplicate "Pants" or old category to their correct subcategories
  console.log('Migrating products to subcategories...');
  const oldPantsCat = await prisma.category.findFirst({
    where: {
      slug: 'pants',
      id: { not: pantParent.id }
    }
  });

  if (oldPantsCat) {
    console.log(`Found old Pants category: ${oldPantsCat.id}. Moving products...`);
    const pantsProducts = await prisma.product.findMany({
      where: { categoryId: oldPantsCat.id }
    });

    for (const p of pantsProducts) {
      let targetCategoryId = pantParent.id;
      if (p.name.toLowerCase().includes('chino')) {
        targetCategoryId = chinoSub.id;
      } else if (p.name.toLowerCase().includes('cargo')) {
        targetCategoryId = cargoSub.id;
      }
      console.log(`Moving product "${p.name}" to category ID ${targetCategoryId}`);
      await prisma.product.update({
        where: { id: p.id },
        data: { categoryId: targetCategoryId }
      });
    }

    // Now delete the old category
    console.log('Deleting duplicate Pants category...');
    await prisma.category.delete({
      where: { id: oldPantsCat.id }
    });
  }

  // Also verify all other products under 'pant' itself
  const pantProducts = await prisma.product.findMany({
    where: { categoryId: pantParent.id }
  });
  for (const p of pantProducts) {
    let targetCategoryId = pantParent.id;
    if (p.name.toLowerCase().includes('chino')) {
      targetCategoryId = chinoSub.id;
    } else if (p.name.toLowerCase().includes('cargo')) {
      targetCategoryId = cargoSub.id;
    }
    if (targetCategoryId !== pantParent.id) {
      console.log(`Moving product "${p.name}" from Pant to subcategory ID ${targetCategoryId}`);
      await prisma.product.update({
        where: { id: p.id },
        data: { categoryId: targetCategoryId }
      });
    }
  }

  // 5. Rename other categories to singular and ensure parentId is null
  const renameList = [
    { oldSlug: 'shirts', newName: 'Shirt', newSlug: 'shirt' },
    { oldSlug: 't-shirts', newName: 'T-Shirt', newSlug: 't-shirt' },
    { oldSlug: 'sandals', newName: 'Sandal', newSlug: 'sandal' },
    { oldSlug: 'caps', newName: 'Cap', newSlug: 'cap' }
  ];

  for (const renameItem of renameList) {
    const cat = await prisma.category.findFirst({
      where: { slug: renameItem.oldSlug }
    });
    if (cat) {
      console.log(`Renaming category ${cat.name} (${cat.slug}) to ${renameItem.newName} (${renameItem.newSlug})...`);
      await prisma.category.update({
        where: { id: cat.id },
        data: {
          name: renameItem.newName,
          slug: renameItem.newSlug,
          parentId: null
        }
      });
    }
  }

  // 6. Update broken image URLs
  console.log('Fixing broken product images...');
  
  // A. Men's Vintage Check Flannel Shirt
  const flannelShirt = await prisma.product.findFirst({
    where: { slug: 'mens-vintage-check-flannel-shirt' }
  });
  if (flannelShirt) {
    console.log('Updating Vintage Check Flannel Shirt image...');
    await prisma.product.update({
      where: { id: flannelShirt.id },
      data: { image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=400' }
    });
  }

  // B. Premium Silk Tie
  const silkTie = await prisma.product.findFirst({
    where: { slug: 'premium-silk-tie' }
  });
  if (silkTie) {
    console.log('Updating Premium Silk Tie image...');
    await prisma.product.update({
      where: { id: silkTie.id },
      data: { image: 'https://images.unsplash.com/photo-1594534475808-b18fc33b045e?q=80&w=400' }
    });
  }

  console.log('--- DATABASE RESTORE & CLEANUP COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
