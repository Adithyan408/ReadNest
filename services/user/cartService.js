import Product from "../../models/productsSchema.js";
import Address from "../../models/addressSchema.js";
import Cart from "../../models/cartSchema.js";
import Category from "../../models/categorySchema.js";
import { normalizeCart } from "../../helpers/cartNormal.js";

export const loadCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    const cartDoc = await Cart.findOne({ userId }).populate("items.productId");

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
          })
        )
      : [];

    const addresses = await Address.find({ userId });

    res.render("cart", {
      cart,
      addresses,
      inactiveCount: cartDoc?.inactiveItems?.length || 0,
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
      return res.status(401).json({
        success: false,
        message: "Please login to continue",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    const categoryDoc = await Category.findOne({
      categoryName: product.category,
    });

    if (product.isListed === false || categoryDoc?.isListed === false) {
      return res.status(403).json({
        success: false,
        message: "Product is no longer available",
      });
    }

    if (product.stock <= 0) {
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
    return res.status(200).json({
      success: true,
      message: "Added to cart",
    });
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

    const product = await Product.findById(productId);
    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    const categoryDoc = await Category.findOne({
      categoryName: product.category,
    });

    if (
      product.isListed === false ||
      categoryDoc?.isListed === false ||
      product.stock <= 0
    ) {
      return res.json({
        success: false,
        message: "Product is no longer available",
      });
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

    const product = await Product.findById(productId);
    const categoryDoc = await Category.findOne({
      categoryName: product.category,
    });

    if (
      product.isListed === false ||
      categoryDoc?.isListed === false ||
      product.stock <= 0
    ) {
      return res.json({
        success: false,
        message: "Product is no longer available",
      });
    }

    req.session.buyNowQuantity = Number(quantity);

    return res.json({ success: true });
  } catch (error) {
    console.log("BuyNow Quantity update error:", error);
    return res.json({ success: false });
  }
};

export const validateCartBeforeCheckout = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Login required" });
    }

    if (req.session.buyNowProductId) {
      const product = await Product.findById(
        req.session.buyNowProductId
      ).lean();

      if (!product) {
        return res.json({
          success: false,
          unavailableItems: [
            { name: "Product", reason: "Product no longer exists" },
          ],
        });
      }

      const category = await Category.findOne({
        categoryName: product.category,
      }).lean();

      if (
        product.isListed === false ||
        category?.isListed === false ||
        product.stock <= 0
      ) {
        return res.json({
          success: false,
          unavailableItems: [
            {
              name: product.productName,
              reason:
                product.stock <= 0
                  ? "Out of stock"
                  : "No longer available",
            },
          ],
        });
      }

      return res.json({
        success: true,
        unavailableItems: [],
        removedCount: 0,
      });
    }

    const cart = await Cart.findOne({ userId }).lean();
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const unavailableItems = [];
    const validItems = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.productId).lean();
      if (!product) {
        unavailableItems.push({
          name: "Unknown product",
          reason: "Product no longer exists",
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
            product.stock <= 0 ? "Out of stock" : "No longer available",
        });
      } else {
        validItems.push(item);
      }
    }

    if (unavailableItems.length > 0) {
      await Cart.updateOne(
        { userId },
        { $set: { items: validItems } }
      );
    }

    return res.json({
      success: true,
      unavailableItems,
      removedCount: unavailableItems.length,
    });
  } catch (err) {
    console.error("Cart validation error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

