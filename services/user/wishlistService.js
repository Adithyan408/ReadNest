import Wishlist from "../../models/wishlistSchema.js";
import Product from "../../models/productsSchema.js";
import Cart from "../../models/cartSchema.js";
import Category from "../../models/categorySchema.js";

export const WishlistToggle = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { productId } = req.body;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID missing" });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId,
        products: [productId],
      });

      return res.json({ success: true, inWishlist: true });
    }

    const index = wishlist.products.findIndex(
      (p) => p.toString() === productId
    );

    if (index > -1) {
      wishlist.products.splice(index, 1);
      await wishlist.save();

      return res.json({ success: true, inWishlist: false });
    } else {
      wishlist.products.push(productId);
      await wishlist.save();

      return res.json({ success: true, inWishlist: true });
    }
  } catch (err) {
    console.error("Wishlist toggle error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    if (!userId) return res.redirect("/login");

    const wishlist = await Wishlist.findOne({ userId }).lean();

    if (!wishlist || wishlist.products.length === 0) {
      return res.render("wishlist", {
        wishlist: [],
        user: req.session.user,
      });
    }

    const products = await Product.find({
      _id: { $in: wishlist.products },
      isListed: true,
    }).lean();

    const now = new Date();

    const finalWishlist = await Promise.all(
      products.map(async (product) => {
        const regularPrice = product.regularPrice;

        let productDiscount = 0;

        if (product.offer?.isOffer) {
          const start = product.offer.startDate;
          const end = product.offer.endDate;

          const valid =
            (!start || now >= new Date(start)) &&
            (!end || now <= new Date(end));

          if (valid) productDiscount = product.offer.discountValue;
        }

        let categoryDiscount = 0;

        const categoryDoc = await Category.findOne({
          categoryName: product.category,
        });

        if (categoryDoc?.offer?.isOffer) {
          const start = categoryDoc.offer.startDate;
          const end = categoryDoc.offer.endDate;

          const valid =
            (!start || now >= new Date(start)) &&
            (!end || now <= new Date(end));

          if (valid) categoryDiscount = categoryDoc.offer.discountValue;
        }

        const bestDiscount = Math.max(productDiscount, categoryDiscount);

        let offerPrice = null;

        if (bestDiscount > 0) {
          offerPrice = Math.round(
            regularPrice - (regularPrice * bestDiscount) / 100
          );
        }

        return {
          _id: product._id,
          productName: product.productName, // 👈 matches EJS
          productImage: product.productImage, // 👈 full array for [0]
          regularPrice,
          offerPrice,
          discount: bestDiscount,
          price: offerPrice || regularPrice,
          stock: product.stock,
        };
      })
    );

    return res.render("wishlist", {
      wishlist: finalWishlist,
      user: req.session.user,
    });
  } catch (error) {
    console.error("Error loading wishlist:", error);
    return res.render("notFound");
  }
};

export const moveSingleToCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { productId } = req.body;
    if (!userId) return res.redirect("/login");
    const product = await Product.findById(productId);
    if (!product) return res.redirect("/wishlist");
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }
    const itemExists = cart.items.find(
      (i) => i.productId.toString() === productId
    );
    if (itemExists) {
      itemExists.quantity += 1;
    } else {
      cart.items.push({ productId, quantity: 1 });
    }
    await cart.save();
    await Wishlist.updateOne({ userId }, { $pull: { products: productId } });
    return res.redirect("/cart");
  } catch (error) {
    console.log("Move single wishlist item error:", error);
    return res.redirect("/wishlist");
  }
};

export const moveAllToCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    if (!userId) return res.redirect("/login");

    const wishlist = await Wishlist.findOne({ userId }).lean();
    if (!wishlist || wishlist.products.length === 0) {
      return res.redirect("/wishlist");
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
      });
    }

    for (let productId of wishlist.products) {
      const itemExists = cart.items.find(
        (i) => i.productId.toString() === productId.toString()
      );

      if (itemExists) {
        itemExists.quantity += 1;
      } else {
        cart.items.push({
          productId,
          quantity: 1,
        });
      }
    }

    await cart.save();

    await Wishlist.updateOne({ userId }, { $set: { products: [] } });

    return res.redirect("/cart");
  } catch (error) {
    console.log("Move all wishlist items error:", error);
    return res.redirect("/wishlist");
  }
};

export const removeSingleWishlistItem = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { productId } = req.body;

    if (!userId) return res.redirect("/login");

    await Wishlist.updateOne({ userId }, { $pull: { products: productId } });

    return res.redirect("/wishlist");
  } catch (error) {
    console.log("Error removing wishlist item:", error);
    return res.redirect("/wishlist");
  }
};

export const removeAllWishlistItems = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    if (!userId) return res.redirect("/login");

    await Wishlist.updateOne({ userId }, { $set: { products: [] } });

    return res.redirect("/wishlist");
  } catch (error) {
    console.log("Error clearing wishlist:", error);
    return res.redirect("/wishlist");
  }
};
