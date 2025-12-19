import Order from "../../models/orderSchema.js";
import Product from "../../models/productsSchema.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import {
  creditWallet,
  calculateRefundAmount,
} from "../../middlewares/walletHandler.js";

export const getOrderDetailsPage = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId)
      .populate("items.product", "productImage")
      .lean();

    if (!order) return res.render("notFound");

    order.items = order.items.map((item) => {
      const canCancel =
        item.status === "processing" || item.status === "ordered";

      const canReturn = item.status === "delivered";

      return {
        ...item,
        canCancel,
        canReturn,
      };
    });

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    const FINAL_STATUSES = ["delivered", "returned", "cancelled"];

    const isInvoiceAvailable = order.items.every((item) =>
      FINAL_STATUSES.includes(item.status)
    );
    if (!isInvoiceAvailable) {
      return res.status(403).render("notAuthorized", {
        message: "Invoice is available only after order completion",
      });
    }

    res.render("orderDetails", {
      order,
      selectedAddress: order.address,
      isInvoiceAvailable,
    });
  } catch (err) {
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

    if (!["ordered", "shipped"].includes(item.status)) {
      return res.render("notFound");
    }

    const previousStatus = item.status;
    item.status = "cancelled";
    item.cancelledAt = new Date();

    const activeItems = order.items.filter(
      (i) => !["cancelled", "returned"].includes(i.status)
    );

    let refundAmount = item.subtotal;
    let note = "Refund for cancelled item";

    if (order.discount > 0 && !order.couponAdjusted) {
      refundAmount -= order.discount;
      order.couponAdjusted = true;
      note += " (coupon adjusted)";
    }

    if (activeItems.length === 0 && !order.shippingRefunded) {
      refundAmount += order.shippingCharge;
      order.shippingRefunded = true;
      note += " + shipping refunded";
    }

    item.refundAmount = refundAmount;

    order.status =
      activeItems.length === 0 ? "cancelled" : "partially_cancelled";

    await order.save();

    if (["ONLINE", "WALLET"].includes(order.paymentMethod)) {
      await creditWallet({
        userId: order.user,
        amount: item.refundAmount,
        note,
        orderId: order._id,
        paymentId: order.paymentId || null,
      });
    }

    return res.redirect(`/orders/${orderId}`);
  } catch (err) {
    console.log("Cancel Order Error:", err);
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
    if (!item || item.status !== "delivered") {
      return res.render("notFound");
    }

    if (item.returnStatus !== "none") {
      return res.redirect(`/orders/${orderId}`);
    }

    item.returnStatus = "requested";
    item.returnReason = returnReason;

    await order.save();

    res.redirect(`/orders/${orderId}`);
  } catch (err) {
    console.log("Return Item Error:", err);
    return res.render("notFound");
  }
};
export const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId).lean();
    if (!order) return res.render("notFound");

    // 🔒 Allow invoice only if all items reached final state
    const FINAL_STATUSES = ["delivered", "returned", "cancelled"];
    const isInvoiceAvailable = order.items.every((item) =>
      FINAL_STATUSES.includes(item.status)
    );

    if (!isInvoiceAvailable) {
      return res.status(403).render("notAuthorized", {
        message: "Invoice is available only after order completion",
      });
    }

    const invoiceName = `invoice-${orderId}.pdf`;
    const invoiceDir = "invoices";
    const invoicePath = path.join(invoiceDir, invoiceName);

    if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir);

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${invoiceName}"`);

    doc.pipe(fs.createWriteStream(invoicePath));
    doc.pipe(res);

    /* ---------------- HEADER ---------------- */

    const logoPath = path.join("public", "images", "logo2.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 30, { width: 70 });
    }

    doc.fontSize(26).fillColor("#333").text("READNEST", { align: "center" });

    doc
      .fontSize(12)
      .fillColor("#666")
      .text("Digital Book Store", { align: "center" });

    doc.moveTo(40, 100).lineTo(550, 100).strokeColor("#ccc").stroke();
    doc.moveDown(2);

    doc.fontSize(20).fillColor("#222").text("INVOICE", { align: "center" });
    doc.moveDown(1);

    doc
      .fontSize(12)
      .fillColor("#444")
      .text(`Order ID: ${order._id}`, { align: "center" })
      .text(`Order Date: ${new Date(order.createdAt).toLocaleString()}`, {
        align: "center",
      });

    doc.moveDown(2);

    /* ---------------- ADDRESS ---------------- */

    if (order.address) {
      const a = order.address;

      doc.roundedRect(40, doc.y, 510, 90, 8).stroke("#999");

      doc
        .fontSize(14)
        .fillColor("#222")
        .text("Delivery Address", 50, doc.y + 8);

      doc
        .fontSize(12)
        .fillColor("#444")
        .text(
          `${a.addressLabel}
${a.houseName}, ${a.street}
${a.city}, ${a.state} - ${a.pincode}
Phone: ${a.phone}`,
          50,
          doc.y + 25,
          { lineGap: 2 }
        );

      doc.moveDown(4);
    }

    /* ---------------- ITEMS TABLE ---------------- */

    doc.fontSize(14).fillColor("#222").text("Order Items", { underline: true });

    const tableTop = doc.y + 10;
    const columnX = { item: 40, qty: 260, price: 330, subtotal: 430 };

    doc.rect(40, tableTop, 510, 22).fill("#f2f2f2").stroke();

    doc
      .fillColor("#000")
      .fontSize(12)
      .text("Item", columnX.item, tableTop + 6)
      .text("Qty", columnX.qty, tableTop + 6)
      .text("Price", columnX.price, tableTop + 6)
      .text("Subtotal", columnX.subtotal, tableTop + 6);

    let posY = tableTop + 30;

    const invoiceItems = order.items.filter(
      (item) => item.status !== "cancelled"
    );

    invoiceItems.forEach((item) => {
      doc
        .fillColor("#333")
        .text(item.productName, columnX.item, posY)
        .text(item.quantity.toString(), columnX.qty, posY)
        .text(`₹${item.unitPrice}`, columnX.price, posY)
        .text(`₹${item.subtotal}`, columnX.subtotal, posY);

      doc
        .moveTo(40, posY + 18)
        .lineTo(550, posY + 18)
        .stroke("#ddd");
      posY += 25;
    });

    /* ---------------- SUMMARY ---------------- */

    const subtotal = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);

    const discount = Number(order.discount || 0);
    const shippingCharge = Number(order.shippingCharge || 0);
    const totalAmount = Number(order.finalPayable);

    doc.roundedRect(300, posY + 10, 250, 120, 8).stroke("#999");

    doc
      .fontSize(12)
      .fillColor("#444")
      .text(`Subtotal: ₹${subtotal}`, 320, posY + 25)
      .text(`Discount: ₹${discount}`, 320, posY + 45)
      .text(`Shipping: ₹${shippingCharge}`, 320, posY + 65)
      .fontSize(13)
      .fillColor("#000")
      .text(`Total Amount Paid: ₹${totalAmount}`, 320, posY + 90);

    doc.moveDown(5);

    doc
      .fontSize(10)
      .fillColor("#777")
      .text("Thank you for shopping with READNEST!", {
        align: "center",
      });

    doc.end();
  } catch (error) {
    console.log("Invoice Error:", error);
    res.render("notFound");
  }
};

export const getListOrders = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    const search = req.query.search?.trim() || "";

    let query = { user: userId };

    if (search) {
      query.$expr = {
        $regexMatch: {
          input: { $toString: "$_id" },
          regex: search,
          options: "i",
        },
      };
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    let noResultsMessage = null;

    if (search && orders.length === 0) {
      noResultsMessage = `No orders found with Order ID "${search}"`;
    }

    res.render("orders", {
      orders,
      search,
      noResultsMessage,
    });
  } catch (err) {
    console.log("Orders Page Error:", err);
    res.render("notFound");
  }
};
