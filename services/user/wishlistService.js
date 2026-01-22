import Wishlist from '../../models/wishlistSchema.js';
import Product from '../../models/productsSchema.js';
import Cart from '../../models/cartSchema.js';
import Category from '../../models/categorySchema.js';
import User from '../../models/userSchema.js';
import { HttpStatus } from '../../helpers/statusCodes.js';

export const WishlistToggle = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { productId } = req.body;

    if (!productId) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: 'Product ID missing' });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId,
        products: [productId],
      });

      return res.status(HttpStatus.OK).json({ success: true, inWishlist: true });
    }

    const index = wishlist.products.findIndex(
      (p) => p.toString() === productId,
    );

    if (index > -1) {
      wishlist.products.splice(index, 1);
      await wishlist.save();

      return res.json({ success: true, inWishlist: false });
    } else {
      wishlist.products.push(productId);
      await wishlist.save();

      return res.status(HttpStatus.OK).json({ success: true, inWishlist: true });
    }
  } catch (err) {
    console.error('Wishlist toggle error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};

export const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.status(HttpStatus.UNAUTHORIZED).redirect('/login');

    const wishlist = await Wishlist.findOne({ userId }).lean();

    if (!wishlist || wishlist.products.length === 0) {
      return res.render('wishlist', {
        wishlist: [],
        user: req.session.user,
      });
    }

    const products = await Product.find({
      _id: { $in: wishlist.products },
    }).lean();

    const finalWishlist = await Promise.all(
      products.map(async (product) => {
        const categoryDoc = await Category.findOne({
          categoryName: product.category,
        });

        const isAvailable =
          product.isListed !== false &&
          categoryDoc?.isListed !== false &&
          product.stock > 0;

        const regularPrice = product.regularPrice;
        const now = new Date();

        let productDiscount = 0;
        if (product.offer?.isOffer) {
          const { startDate, endDate } = product.offer;
          const valid =
            (!startDate || now >= new Date(startDate)) &&
            (!endDate || now <= new Date(endDate));
          if (valid) productDiscount = product.offer.discountValue;
        }

        let categoryDiscount = 0;
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
            ? Math.round(
                regularPrice - (regularPrice * bestDiscount) / 100,
              )
            : null;

        return {
          _id: product._id,
          productName: product.productName,
          productImage: product.productImage,
          regularPrice,
          offerPrice,
          discount: bestDiscount,
          price: offerPrice || regularPrice,
          stock: product.stock,
          isAvailable,
        };
      }),
    );

    const user = await User.findById(userId);
    return res.render('wishlist', {
      wishlist: finalWishlist,
      user,
    });
  } catch (error) {
    console.error('Error loading wishlist:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('notFound');
  }
};

export const moveSingleToCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { productId } = req.body;

    if (!userId) return res.status(HttpStatus.UNAUTHORIZED).redirect('/login');

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(HttpStatus.NOT_FOUND).redirect('/wishlist?error=not-found');
    }

    const categoryDoc = await Category.findOne({
      categoryName: product.category,
    });

    if (
      product.isListed === false ||
      categoryDoc?.isListed === false ||
      product.stock <= 0
    ) {
      return res.redirect('/wishlist?error=product-unavailable');
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const itemExists = cart.items.find(
      (i) => i.productId.toString() === productId.toString(),
    );

    if (itemExists) {
      itemExists.quantity += 1;
    } else {
      cart.items.push({ productId, quantity: 1 });
    }

    await cart.save();
    const freshProduct = await Product.findById(productId);
    const freshCategory = await Category.findOne({
      categoryName: freshProduct.category,
    });

    if (
      freshProduct.isListed === false ||
      freshCategory?.isListed === false ||
      freshProduct.stock <= 0
    ) {
      await Cart.updateOne({ userId }, { $pull: { items: { productId } } });

      return res.redirect('/wishlist?error=product-unavailable');
    }

    await Wishlist.updateOne({ userId }, { $pull: { products: productId } });

    return res.redirect('/cart');
  } catch (error) {
    console.log('Move single wishlist item error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).redirect('/wishlist?error=server');
  }
};

export const moveAllToCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect('/login');

    const wishlist = await Wishlist.findOne({ userId }).lean();
    if (!wishlist || wishlist.products.length === 0) {
      return res.redirect('/wishlist');
    }

    for (let productId of wishlist.products) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.redirect('/wishlist?error=product-unavailable');
      }

      const categoryDoc = await Category.findOne({
        categoryName: product.category,
      });

      if (
        product.isListed === false ||
        categoryDoc?.isListed === false ||
        product.stock <= 0
      ) {
        return res.redirect('/wishlist?error=product-unavailable');
      }
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    for (let productId of wishlist.products) {
      const itemExists = cart.items.find(
        (i) => i.productId.toString() === productId.toString(),
      );

      if (itemExists) {
        itemExists.quantity += 1;
      } else {
        cart.items.push({ productId, quantity: 1 });
      }
    }

    await cart.save();

    for (let productId of wishlist.products) {
      const product = await Product.findById(productId);
      const categoryDoc = await Category.findOne({
        categoryName: product.category,
      });

      if (
        product.isListed === false ||
        categoryDoc?.isListed === false ||
        product.stock <= 0
      ) {
        await Cart.updateOne(
          { userId },
          { $pull: { items: { productId: { $in: wishlist.products } } } },
        );

        return res.redirect('/wishlist?error=product-unavailable');
      }
    }

    await Wishlist.updateOne({ userId }, { $set: { products: [] } });

    return res.redirect('/cart');
  } catch (error) {
    console.log('Move all wishlist items error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).redirect('/wishlist?error=server');
  }
};

export const removeSingleWishlistItem = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { productId } = req.body;

    if (!userId) return res.status(HttpStatus.UNAUTHORIZED).redirect('/login');

    await Wishlist.updateOne({ userId }, { $pull: { products: productId } });

    return res.redirect('/wishlist');
  } catch (error) {
    console.log('Error removing wishlist item:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).redirect('/wishlist');
  }
};

export const removeAllWishlistItems = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    if (!userId) return res.status(HttpStatus.UNAUTHORIZED).redirect('/login');

    await Wishlist.updateOne({ userId }, { $set: { products: [] } });

    return res.redirect('/wishlist');
  } catch (error) {
    console.log('Error clearing wishlist:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).redirect('/wishlist');
  }
};
