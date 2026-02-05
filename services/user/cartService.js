import Product from '../../models/productsSchema.js';
import Address from '../../models/addressSchema.js';
import Cart from '../../models/cartSchema.js';
import Category from '../../models/categorySchema.js';
import { normalizeCart } from '../../helpers/cartNormal.js';
import { HttpStatus } from '../../helpers/statusCodes.js';

export const loadCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    const cartDoc = await Cart.findOne({ userId }).populate('items.productId');

    if (cartDoc) {
      await normalizeCart(cartDoc);
    }

    const cart = cartDoc
      ? await Promise.all(
          cartDoc.items.map(async (i) => {
            const product = i.productId;

            const now = new Date();
            const regularPrice = product.regularPrice;

            let productDiscount = 0;
            if (product.offer?.isOffer) {
              const { startDate, endDate } = product.offer;
              const valid =
                (!startDate || now >= new Date(startDate)) &&
                (!endDate || now <= new Date(endDate));
              if (valid) productDiscount = product.offer.discountValue;
            }

            let categoryDiscount = 0;
            const categoryDoc = await Category.findOne({
              categoryName: product.category,
            });

            if (categoryDoc?.offer?.isOffer) {
              const { startDate, endDate } = categoryDoc.offer;
              const valid =
                (!startDate || now >= new Date(startDate)) &&
                (!endDate || now <= new Date(endDate));
              if (valid) categoryDiscount = categoryDoc.offer.discountValue;
            }

            const bestDiscount = Math.max(productDiscount, categoryDiscount);

            const offerPrice =
              bestDiscount > 0
                ? Math.round(regularPrice - (regularPrice * bestDiscount) / 100)
                : null;

            return {
              _id: product._id,
              name: product.productName,
              price: offerPrice || regularPrice,
              offerPrice,
              regularPrice,
              discount: bestDiscount,
              image: product.productImage[0],
              quantity: i.quantity,
              stock: product.stock,
            };
          }),
        )
      : [];

    const addresses = await Address.find({ userId });

    res.render('cart', {
      cart,
      addresses,
      inactiveCount: cartDoc?.inactiveItems?.length || 0,
      query: req.query,
    });
  } catch (error) {
    console.log('Cart load error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).redirect('/notfound');
  }
};

export const addcart = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const productId = req.body.productId;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Please login to continue',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(HttpStatus.NOT_FOUND).json({
      success: false,
      message: 'Product not found',
    });
    }

    const categoryDoc = await Category.findOne({
      categoryName: product.category,
    });

    if (product.isListed === false || categoryDoc?.isListed === false) {
      return res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        message: 'Product is no longer available',
      });
    }

    if (product.stock <= 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Product is out of stock',
      });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
      });
    }

    const existingItem = cart.items.find(
      (i) => i.productId.toString() === productId.toString(),
    );

    if (existingItem) {

  if (existingItem.quantity >= product.stock) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Only limited stock available',
    });
  }

  if (existingItem.quantity >= 10) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Maximum quantity reached (10)',
    });
  }

  existingItem.quantity += 1;

}
 else {
      cart.items.push({
        productId,
        quantity: 1,
      });
    }
    if (cart.items.length >= 10 && !existingItem) {
      return res.status(400).json({
      success: false,
      message: 'Maximum 10 products allowed in cart',
    });
    }

    await cart.save();
    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Added to cart',
    });
  } catch (error) {
    console.log('Add to DB cart error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

export const cartRemove = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const productId = req.query.id;

    if (!userId) return res.status(HttpStatus.UNAUTHORIZED).redirect('/login');

    await Cart.updateOne({ userId }, { $pull: { items: { productId } } });

    return res.redirect('/cart');
  } catch (error) {
    console.log('Error removing cart item:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).redirect('/cart');
  }
};

export const updateCartQuantity = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { productId, quantity } = req.body;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Login required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    const categoryDoc = await Category.findOne({
      categoryName: product.category,
    });

    if (
      product.isListed === false ||
      categoryDoc?.isListed === false ||
      product.stock <= 0
    ) {
      return res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        message: 'Product is no longer available',
      });
    }

    await Cart.updateOne(
      { userId, 'items.productId': productId },
      { $set: { 'items.$.quantity': quantity } },
    );

    return res.json({ success: true });
  } catch (error) {
    console.log('Quantity update error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

export const validateCartBeforeCheckout = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Login required' });
    }
    const cart = await Cart.findOne({ userId }).lean();
    if (!cart || cart.items.length === 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Cart is empty' });
    }

    const unavailableItems = [];
    const validItems = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.productId).lean();
      if (!product) {
        unavailableItems.push({
          name: 'Unknown product',
          reason: 'Product no longer exists',
        });
        continue;
      }

      const category = await Category.findOne({
        categoryName: product.category,
      }).lean();

      if (
        product.isListed === false ||
        category?.isListed === false ||
        product.stock <= 0
      ) {
        unavailableItems.push({
          name: product.productName,
          reason:
            product.stock <= 0 ? 'Out of stock' : 'No longer available',
        });
      } else {
        validItems.push(item);
      }
    }

    if (unavailableItems.length > 0) {
      await Cart.updateOne(
        { userId },
        { $set: { items: validItems } },
      );
    }

    return res.json({
      success: true,
      unavailableItems,
      removedCount: unavailableItems.length,
    });
  } catch (err) {
    console.error('Cart validation error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Server error' });
  }
};

