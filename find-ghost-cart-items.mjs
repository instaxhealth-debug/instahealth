import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findGhostItems() {
  const allCartItems = await prisma.cartItem.findMany({
    include: {
      product: true,
      variant: true
    }
  });
  
  const ghostItems = allCartItems.filter(item => 
    !item.product || (item.variantId && !item.variant)
  );
  
  console.log('\n=== GHOST CART ITEMS ===');
  console.log('Total cart items:', allCartItems.length);
  console.log('Ghost items (bad references):', ghostItems.length);
  
  if (ghostItems.length > 0) {
    console.log('\nGhost items details:');
    ghostItems.forEach(item => {
      console.log('- CartItem ID:', item.id);
      console.log('  ProductId:', item.productId, '(exists:', !!item.product, ')');
      console.log('  VariantId:', item.variantId, '(exists:', !!item.variant, ')');
      console.log('  Quantity:', item.quantity);
      console.log('  UserId:', item.userId);
      console.log('  SessionId:', item.sessionId);
      console.log('  LocationId:', item.locationId);
      console.log('');
    });
  }
  
  await prisma.$disconnect();
}

findGhostItems().catch(console.error);
