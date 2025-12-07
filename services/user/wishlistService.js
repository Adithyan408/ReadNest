import Wishlist from "../../models/wishlistSchema.js"
import Product from "../../models/productsSchema.js";
import Cart from "../../models/cartSchema.js";

export const WishlistToggle = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID missing" });
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

    if (!userId) {
      return res.redirect("/login");
    }

    const wishlist = await Wishlist.findOne({ userId }).lean();

    if (!wishlist || wishlist.products.length === 0) {
      return res.render("wishlist", {
        wishlist: [],
        user: req.session.user,
      });
    }

    const products = await Product.find({
      _id: { $in: wishlist.products },    
      isListed: true          
    })
      .select("productName productImage regularPrice stock") 
      .lean();

    return res.render("wishlist", {
      wishlist: products,
      user: req.session.user,
    });

  } catch (error) {
    console.error("Error loading wishlist:", error);
    res.render("notFound");
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
      cart = new Cart({
        userId,
        items: [],
      });
    }

    const itemExists = cart.items.find(
      (i) => i.productId.toString() === productId
    );

    if (itemExists) {
      itemExists.quantity += 1;
    } else {
      cart.items.push({
        productId,
        quantity: 1,
      });
    }

    await cart.save();

    await Wishlist.updateOne(
      { userId },
      { $pull: { products: productId } }
    );

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

    await Wishlist.updateOne(
      { userId },
      { $set: { products: [] } }
    );

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

    await Wishlist.updateOne(
      { userId },
      { $pull: { products: productId } }
    );

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

    await Wishlist.updateOne(
      { userId },
      { $set: { products: [] } }
    );

    return res.redirect("/wishlist");
  } catch (error) {
    console.log("Error clearing wishlist:", error);
    return res.redirect("/wishlist");
  }
};
