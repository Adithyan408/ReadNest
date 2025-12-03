import Order from "../../models/orderSchema.js";
import Product from "../../models/productsSchema.js";

export const getOrdersPage = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    res.render("orders", { orders });
  } catch (err) {
    console.log("Orders Page Error:", err);
    res.render("notFound");
  }
};

export const getOrderDetailsPage = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId)
      .populate("items.product", "productImage") // populate product images
      .lean();

    if (!order) return res.render("notFound");

    res.render("orderDetails", { order });
  } catch (err) {
    console.log("Order Details Error:", err);
    res.render("notFound");
  }
};

export const cancelOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.json({ success: false, message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.json({ success: false, message: "Item not found" });

    if (item.status !== "ordered") {
      return res.json({ success: false, message: "Cannot cancel this item" });
    }

    item.status = "cancelled";
    item.cancelledAt = new Date();

    await order.save();

    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } }
    );

    return res.json({ success: true });
  } catch (err) {
    console.log("Cancel Item Error:", err);
    return res.json({ success: false, message: "Error cancelling item" });
  }
};

export const returnOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.json({ success: false, message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.json({ success: false, message: "Item not found" });

    if (item.status !== "delivered") {
      return res.json({ success: false, message: "Item not returnable" });
    }

    item.status = "returned";
    item.returnedAt = new Date();

    await order.save();

    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } }
    );

    return res.json({ success: true });
  } catch (err) {
    console.log("Return Item Error:", err);
    return res.json({ success: false, message: "Error returning item" });
  }
};
