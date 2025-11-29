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
