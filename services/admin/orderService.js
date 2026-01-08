import Order from "../../models/orderSchema.js";
import Product from "../../models/productsSchema.js";
import Coupon from "../../models/couponSchema.js";
import {
  creditWallet,
  calculateRefundAmount,
} from "../../middlewares/walletHandler.js";
import { ERROR_MESSAGES } from "../../helpers/errorMessages.js";

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

    const ordersWithStatus = allOrders.map((order) => {
      const hasReturnRequest = order.items?.some(
        (item) => item.returnStatus === "requested"
      );

      let overallStatus = order.status;

      if (hasReturnRequest) {
        overallStatus = "Return_Requested";
      }

      return {
        ...order,
        overallStatus,
        hasReturnRequest,
      };
    });

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
    const orderId = req.params.orderId;
    const order = await Order.findOne({ orderId })
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

    await Order.findOneAndUpdate({ orderId }, { status });

    res.json({ success: true });
  } catch (error) {
    console.log("Order Status Update Error:", error);
    res.json({ success: false, message: ERROR_MESSAGES.SERVER.INTERNAL_ERROR });
  }
};

export const updateItemStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.json({
        success: false,
        message: ERROR_MESSAGES.ORDER.NOT_FOUND,
      });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.json({ success: false, message: "Item not found" });
    }

    if (["cancelled", "returned"].includes(item.status)) {
      return res.json({
        success: false,
        message: `Item is already ${item.status} and cannot be updated`,
      });
    }

    const previousStatus = item.status;

    const ADMIN_STATUS_FLOW = {
      ordered: ["shipped"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
      returned: [],
    };

    const allowedNextStatuses = ADMIN_STATUS_FLOW[item.status] || [];

    if (!allowedNextStatuses.includes(status)) {
      return res.json({
        success: false,
        message: `Cannot change status from ${item.status} to ${status}`,
      });
    }

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
    return res.json({
      success: false,
      message: ERROR_MESSAGES.SERVER.INTERNAL_ERROR,
    });
  }
};

const calculateDiscount = (amount, coupon) => {
  if (!coupon) return 0;

  if (amount < coupon.minPurchase) return 0;

  let discountAmount = Math.floor((amount * coupon.discount) / 100);

  if (coupon.maxDiscount !== null && discountAmount > coupon.maxDiscount) {
    discountAmount = coupon.maxDiscount;
  }

  return discountAmount;
};

export const approveReturn = async (req, res) => {
  try {
    const safeNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

    const { orderId, itemId } = req.params;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.ORDER.NOT_FOUND,
      });
    }

    const item = order.items.id(itemId);
    if (!item || item.returnStatus !== "requested") {
      return res.status(400).json({
        success: false,
        message: "Invalid return request",
      });
    }

    if (item.refundAmount > 0) {
      return res.status(400).json({
        success: false,
        message: "Refund already processed",
      });
    }


    const shippingCharge = safeNumber(order.shippingCharge);
    const totalPaid = safeNumber(order.finalPayable ?? order.payableAmount);

 
    const refundablePool = Math.max(totalPaid - shippingCharge, 0);



    
    const refundBaseItems = order.items.filter((i) => i.status !== "cancelled");

    const totalItemsValue = refundBaseItems.reduce(
      (sum, i) => sum + safeNumber(i.finalAmount || i.subtotal),
      0
    );

    if (totalItemsValue === 0) {
      return res.status(400).json({
        success: false,
        message: "No refundable amount left",
      });
    }

  

    const itemValue = safeNumber(item.finalAmount || item.subtotal);

    let refundAmount = (itemValue / totalItemsValue) * refundablePool;

    refundAmount = Math.round(refundAmount);
    refundAmount = Math.max(refundAmount, 0);


    item.returnStatus = "approved";
    item.status = "returned";
    item.returnedAt = new Date();
    item.refundAmount = refundAmount;

 

    const activeItems = order.items.filter(
      (i) => !["cancelled", "returned"].includes(i.status)
    );

    order.status =
      activeItems.length === 0 ? "cancelled" : "partially_cancelled";

    await order.save();

 

    await creditWallet({
      userId: order.user,
      amount: refundAmount,
      note: "Refund for returned item (shipping excluded)",
      orderId: order.orderId,
      paymentId: order.paymentId || null,
      itemId: item._id.toString(),
      source: "return_refund",
    });

   

    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } }
    );

    return res.json({
      success: true,
      message: `Return approved. ₹${refundAmount} credited to wallet.`,
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

    const order = await Order.findOne({ orderId });
    if (!order)
      return res.json({
        success: false,
        message: ERROR_MESSAGES.ORDER.NOT_FOUND,
      });

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
    res.json({ success: false, message: ERROR_MESSAGES.SERVER.NOT_FOUND });
  }
};
