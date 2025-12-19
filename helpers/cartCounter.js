import Cart from "../models/cartSchema.js";

const cartCountMiddleware = async (req, res, next) => {
 
  res.locals.cartCount = 0;

  try {
    if (req.session?.user?._id) {
      const cart = await Cart.findOne({
        userId: req.session.user._id,
      });

      if (cart?.items?.length) {
        res.locals.cartCount = cart.items.reduce(
          (total, item) => total + item.quantity,
          0
        );
      }
    }
  } catch (error) {
    console.error("Cart count middleware error:", error);
  }

  next();
};

export default cartCountMiddleware;
