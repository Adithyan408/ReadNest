import Product from '../models/productsSchema.js';
import Category from '../models/categorySchema.js';

export const normalizeCart = async (cart) => {
  const activeItems = [];
  const inactiveItems = [];

  for (const item of cart.items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      inactiveItems.push({ ...item, reason: 'deleted' });
      continue;
    }

    const category = await Category.findOne({
      categoryName: product.category,
    });

    if (
      product.isListed === false ||
      category?.isListed === false
    ) {
      inactiveItems.push({ ...item, reason: 'blocked' });
    } else if (product.stock <= 0) {
      inactiveItems.push({ ...item, reason: 'out-of-stock' });
    } else {
      activeItems.push(item);
    }
  }

  cart.items = activeItems;
  cart.inactiveItems = inactiveItems;

  await cart.save();
};
