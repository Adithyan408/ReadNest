import Cart from '../models/cartSchema.js';
import Product from '../models/productsSchema.js';
import Category from '../models/categorySchema.js';

const cartCountMiddleware = async (req, res, next) => {
  res.locals.cartCount = 0;

  try {
    if (!req.session?.user?._id) {
      return next();
    }

    const cart = await Cart.findOne({
      userId: req.session.user._id,
    }).lean();

    if (!cart || !cart.items || cart.items.length === 0) {
      return next();
    }

   let count = 0;

for (const item of cart.items) {
  const product = await Product.findById(item.productId).lean();
  if (!product) continue;

  const category = await Category.findOne({
    categoryName: product.category,
  }).lean();

  const isAvailable =
    product.isListed !== false &&
    category?.isListed !== false &&
    product.stock > 0;

  if (isAvailable) {
    count += 1; 
  }
}

    res.locals.cartCount = count;
  } catch (error) {
    console.error('Cart count middleware error:', error);
  }

  next();
};

export default cartCountMiddleware;
