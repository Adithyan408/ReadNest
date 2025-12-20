import Order from "../../models/orderSchema.js";
import Product from "../../models/productsSchema.js";
import {
  creditWallet,
  calculateRefundAmount,
} from "../../middlewares/walletHandler.js";

export const loadOrders = async (req, res) => {
  try {
    const search = req.query.search || "";
    const statusFilter = req.query.status || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    let match = {};

    if (search) {
      match.$or = [
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: search,
              options: "i",
            },
          },
        },
        { "user.name": { $regex: search, $options: "i" } },
        { "user.email": { $regex: search, $options: "i" } },
      ];
    }

    const allOrders = await Order.find(match)
      .populate("user", "name email")
      .lean()
      .sort({ createdAt: -1 });

    const ordersWithStatus = allOrders.map((order) => ({
      ...order,
      overallStatus: order.status,
    }));

    let filteredOrders = ordersWithStatus;

    if (statusFilter) {
      filteredOrders = filteredOrders.filter(
        (order) => order.overallStatus === statusFilter
      );
    }

    const totalOrders = filteredOrders.length;
    const totalPages = Math.ceil(totalOrders / limit);

    const paginatedOrders = filteredOrders.slice(
      (page - 1) * limit,
      page * limit
    );

    res.render("orderList", {
      orders: paginatedOrders,
      currentPage: page,
      totalPages,
      search,
      statusFilter,
    });
  } catch (error) {
    console.log("Admin Orders Error:", error);
    res.render("admin-error");
  }
};

export const orderDetails = async (req, res) => {
  try {
    const orderId = req.params.ordersId;

    const order = await Order.findById(orderId)
      .populate("user", "name email phone")
      .populate("items.product", "productName productImage regularPrice")
      .lean();

    if (!order) {
      return res.render("notFound");
    }

    res.render("orderItems", { order });
  } catch (error) {
    console.log("Order Details Error:", error);
    res.render("admin-error");
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "processing",
      "partially_cancelled",
      "cancelled",
      "completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.json({ success: false, message: "Invalid status" });
    }

    await Order.findByIdAndUpdate(orderId, { status });

    res.json({ success: true });
  } catch (error) {
    console.log("Order Status Update Error:", error);
    res.json({ success: false, message: "Server error" });
  }
};

export const updateItemStatus = async (req, res) => {
  try {
    const { ordersId, itemId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(ordersId);
    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.json({ success: false, message: "Item not found" });
    }

    const previousStatus = item.status;

    item.status = status;

    if (status === "cancelled" && previousStatus !== "cancelled") {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    const allStatuses = order.items.map((i) => i.status);

    if (allStatuses.every((s) => s === "delivered")) {
      order.status = "completed";
    } else if (allStatuses.every((s) => s === "cancelled")) {
      order.status = "cancelled";
    } else if (allStatuses.includes("cancelled")) {
      order.status = "partially_cancelled";
    } else {
      order.status = "processing";
    }

    await order.save();

    return res.json({ success: true });
  } catch (err) {
    console.log("Update item status error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};

export const approveReturn = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const item = order.items.id(itemId);
    if (!item || item.returnStatus !== "requested") {
      return res.status(400).json({
        success: false,
        message: "Invalid return request",
      });
    }

    if (item.refundAmount && item.refundAmount > 0) {
      return res.status(400).json({
        success: false,
        message: "Refund already processed",
      });
    }

    // -----------------------------
    // MARK ITEM AS RETURNED
    // -----------------------------
    item.returnStatus = "approved";
    item.status = "returned";
    item.returnedAt = new Date();

    // -----------------------------
    // REFUND AMOUNT (PROPORTIONAL)
    // -----------------------------
    const refundAmount = item.finalAmount; // 🔥 already coupon-adjusted
    const note = "Refund for returned item";

    item.refundAmount = refundAmount;

    // -----------------------------
    // UPDATE ORDER STATUS
    // -----------------------------
    const activeItems = order.items.filter(
      (i) => !["cancelled", "returned"].includes(i.status)
    );

    order.status =
      activeItems.length === 0 ? "cancelled" : "partially_cancelled";

    // -----------------------------
    // CREDIT WALLET
    // -----------------------------
    await creditWallet({
      userId: order.user,
      amount: refundAmount,
      note,
      orderId: order._id,
      paymentId: order.paymentId || null,
      source: "return_refund",
    });

    // -----------------------------
    // RESTOCK INVENTORY
    // -----------------------------
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } }
    );

    await order.save();

    return res.json({
      success: true,
      message: `Return approved. ₹${refundAmount} credited to wallet and item restocked.`,
    });
  } catch (err) {
    console.error("Approve Return Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while approving return",
    });
  }
};

export const rejectReturn = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { note } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.json({ success: false, message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.json({ success: false, message: "Item not found" });

    if (item.returnStatus !== "requested") {
      return res.json({
        success: false,
        message: "No return request to reject",
      });
    }

    item.returnStatus = "rejected";
    item.adminReturnNote = note;

    await order.save();

    res.json({ success: true, message: "Return rejected" });
  } catch (err) {
    console.log("Reject Return Error:", err);
    res.json({ success: false, message: "Server error" });
  }
};
