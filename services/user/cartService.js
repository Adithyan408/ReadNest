import Product from "../../models/productsSchema.js";
import Address from "../../models/addressSchema.js";
import Cart from "../../models/cartSchema.js";
import Category from "../../models/categorySchema.js";

export const loadCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    const cartDoc = await Cart.findOne({ userId }).populate("items.productId");

    const cart = cartDoc
      ? await Promise.all(
          cartDoc.items.map(async (i) => {
            const product = i.productId;
            const now = new Date();
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

            let offerPrice =
              bestDiscount > 0
                ? Math.round(regularPrice - (regularPrice * bestDiscount) / 100)
                : null;

            const finalPrice = offerPrice || regularPrice;

            return {
              _id: product._id,
              name: product.productName,
              price: finalPrice,
              offerPrice: offerPrice,
              regularPrice: regularPrice,
              discount: bestDiscount,
              image: product.productImage[0],
              quantity: i.quantity,
              stock: product.stock,
            };
          })
        )
      : [];

    const addresses = await Address.find({ userId });

    res.render("cart", {
      cart,
      addresses,
      query: req.query,
    });
  } catch (error) {
    console.log("Cart load error:", error);
    res.redirect("/notfound");
  }
};

export const addcart = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const productId = req.body.productId;

    if (!userId) {
      return res.redirect("/login");
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    if (!product || product.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: "Product is out of stock",
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
      (i) => i.productId.toString() === productId.toString()
    );

    if (existingItem) {
      if (existingItem.quantity >= 10) {
        return res.redirect("/cart?error=max-limit");
      }
      existingItem.quantity += 1;
    } else {
      cart.items.push({
        productId,
        quantity: 1,
      });
    }
    if (cart.items.length >= 10 && !existingItem) {
      return res.redirect("/cart?error=max-products");
    }

    await cart.save();

    return res.redirect("/cart");
  } catch (error) {
    console.log("Add to DB cart error:", error);
  }
};

export const cartRemove = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const productId = req.query.id;

    if (!userId) return res.redirect("/login");

    await Cart.updateOne({ userId }, { $pull: { items: { productId } } });

    return res.redirect("/cart");
  } catch (error) {
    console.log("Error removing cart item:", error);
    return res.redirect("/cart");
  }
};

export const updateCartQuantity = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { productId, quantity } = req.body;

    if (!userId) {
      return res.json({ success: false, message: "Login required" });
    }

    await Cart.updateOne(
      { userId, "items.productId": productId },
      { $set: { "items.$.quantity": quantity } }
    );

    return res.json({ success: true });
  } catch (error) {
    console.log("Quantity update error:", error);
    return res.json({ success: false });
  }
};

export const updateBuyNowQty = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { productId, quantity } = req.body;

    if (!userId) {
      return res.json({ success: false, message: "Login required" });
    }

    if (String(req.session.buyNowProductId) !== String(productId)) {
      return res.json({ success: false, message: "Buy Now product mismatch" });
    }

    req.session.buyNowQuantity = Number(quantity);

    return res.json({ success: true });
  } catch (error) {
    console.log("BuyNow Quantity update error:", error);
    return res.json({ success: false });
  }
};
