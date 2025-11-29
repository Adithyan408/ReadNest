import Product from "../../models/productsSchema.js";
import Address from "../../models/addressSchema.js";


export const loadCart = async (req, res) => {
  try {
    const cart = req.session.cart || [];
    const userId = req.session.user?._id;
    const addresses = await Address.find({userId})
    res.render("cart", { cart, addresses });
  } catch (error) {
    res.redirect("/notfound");
  }
};

export const addcart = async (req, res) => {
  try {
    const productId = req.body.productId;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }
    if (!req.session.cart) {
      req.session.cart = [];
    }

    const existingItem = req.session.cart.find((item) => item._id == productId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      req.session.cart.push({
        _id: product._id,
        name: product.productName,
        price: product.salePrice || product.regularPrice,
        image: product.productImage[0],
        quantity: 1,
      });
    }

    return res.redirect("/cart");
  } catch (error) {
    console.log("Add to cart error", error);
  }
};

export const cartRemove = (req, res) => {
  try {
    const productId = req.query.id;
    if (!productId) {
      return res.redirect("/cart");
    }

    // If no cart in session → nothing to remove
    if (!req.session.cart) {
      return res.redirect("/cart");
    }

    // Filter out the product
    req.session.cart = req.session.cart.filter(
      (item) => item._id.toString() !== productId.toString()
    );

    return res.redirect("/cart");

  } catch (error) {
    console.log("Error removing cart item:", error);
    return res.redirect("/cart");
  }
};
