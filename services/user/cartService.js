import Product from "../../models/productsSchema.js";
import Address from "../../models/addressSchema.js";
import Cart from "../../models/cartSchema.js";

export const loadCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    // load cart + product details
    const cartDoc = await Cart.findOne({ userId }).populate("items.productId");

    const cart = cartDoc
      ? cartDoc.items.map((i) => ({
          _id: i.productId._id,
          name: i.productId.productName,
          price: i.productId.salePrice || i.productId.regularPrice,
          image: i.productId.productImage[0],
          quantity: i.quantity,
        }))
      : [];

    // GET ADDRESSES also
    const addresses = await Address.find({ userId });

    res.render("cart", { cart, addresses });
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

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Find user's cart
    let cart = await Cart.findOne({ userId });

    // If no cart, create new
    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
      });
    }

    // Check if product already exists
    const existingItem = cart.items.find(
      (i) => i.productId.toString() === productId.toString()
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items.push({
        productId,
        quantity: 1,
      });
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
