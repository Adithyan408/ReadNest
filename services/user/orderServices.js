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
      .populate("items.product", "productImage")
      .lean();

    if (!order) return res.render("notFound");

    console.log(order.address);
    res.render("orderDetails", { order, selectedAddress: order.address });
  } catch (err) {
    console.log("Order Details Error:", err);
    res.render("notFound");
  }
};

export const cancelOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.render("notFound");

    const item = order.items.id(itemId);
    if (!item) return res.render("notFound");

    if (item.status !== "ordered") {
      return res.render("notFound");
    }

    // Update item status
    item.status = "cancelled";
    item.cancelledAt = new Date();

    await order.save();

    // Return stock
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } }
    );

    // 🔥 Reload the updated order details
    const updatedOrder = await Order.findById(orderId)
      .populate("items.product", "productImage")
      .lean();

    return res.render("orderDetails", {
      order: updatedOrder,
      selectedAddress: updatedOrder.address,
    });
  } catch (err) {
    console.log("Cancel Item Error:", err);
    return res.render("notFound");
  }
};

export const returnOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { returnReason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.render("notFound");

    const item = order.items.id(itemId);
    if (!item) return res.render("notFound");

    if (item.status !== "delivered") {
      return res.render("notFound");
    }

    item.status = "returned";
    item.returnedAt = new Date();
    item.returnReason = returnReason;

    await order.save();

    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } }
    );

  
    const updatedOrder = await Order.findById(orderId)
      .populate("items.product", "productImage")
      .lean();

    return res.render("orderDetails", {
      order: updatedOrder,
      selectedAddress: updatedOrder.address,
    });

  } catch (err) {
    console.log("Return Item Error:", err);
    return res.render("notFound");
  }
};
