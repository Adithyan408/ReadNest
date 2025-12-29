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

    const order = await Order.findOne({ orderId })
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

    const order = await Order.findOne({ orderId });
    if (!order) return res.render("notFound");

    const item = order.items.id(itemId);
    if (!item) return res.render("notFound");

    if (!["ordered", "shipped"].includes(item.status)) {
      return res.render("notFound");
    }

    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } }
    );

    item.status = "cancelled";
    item.cancelledAt = new Date();

    let refundAmount = item.finalAmount;
    let note = "Refund for cancelled item";

    const activeItems = order.items.filter(
      (i) => !["cancelled", "returned"].includes(i.status)
    );

    const anyDelivered = order.items.some((i) => i.status === "delivered");

    if (activeItems.length === 0 && !anyDelivered) {
      refundAmount += Number(order.shippingCharge || 0);
      note += " + shipping refunded";
    }

    item.refundAmount = refundAmount;

    order.status =
      activeItems.length === 0 ? "cancelled" : "partially_cancelled";

    await order.save();

    if (["ONLINE", "WALLET"].includes(order.paymentMethod)) {
      await creditWallet({
        userId: order.user,
        amount: refundAmount,
        note,
        orderId: order.orderId,
        paymentId: order.paymentId || null,
        source: "cancel_refund",
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

    const order = await Order.findOne({ orderId });
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

    const order = await Order.findOne({ orderId }).lean();
    if (!order) return res.render("notFound");

    // ---------------- FINAL STATE CHECK ----------------
    const FINAL_STATUSES = ["delivered", "returned", "cancelled"];
    const isInvoiceAvailable = order.items.every((item) =>
      FINAL_STATUSES.includes(item.status)
    );

    if (!isInvoiceAvailable) {
      return res.status(403).render("notAuthorized", {
        message: "Invoice is available only after order completion",
      });
    }

    // ---------------- PDF SETUP ----------------
    const invoiceName = `invoice-${orderId}.pdf`;
    const invoiceDir = "invoices";
    const invoicePath = path.join(invoiceDir, invoiceName);

    if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir);

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${invoiceName}"`);

    doc.pipe(fs.createWriteStream(invoicePath));
    doc.pipe(res);

    // ---------------- HEADER ----------------
    const logoPath = path.join("public", "images", "logo2.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 30, { width: 70 });
    }

    doc.fontSize(26).fillColor("#333").text("READNEST", { align: "center" });
    doc.fontSize(12).fillColor("#666").text("Digital Book Store", {
      align: "center",
    });

    doc.moveTo(40, 100).lineTo(550, 100).stroke("#ccc");
    doc.moveDown(2);

    doc.fontSize(20).fillColor("#222").text("INVOICE", { align: "center" });
    doc.moveDown(1);

    doc
      .fontSize(12)
      .fillColor("#444")
      .text(`Order ID: ${order.orderId}`, { align: "center" })
      .text(`Order Date: ${new Date(order.createdAt).toLocaleString()}`, {
        align: "center",
      });

    doc.moveDown(2);

    // ---------------- ADDRESS ----------------
    if (order.address) {
      const a = order.address;

      const boxX = 40;
      const boxY = doc.y;
      const boxWidth = 510;
      const padding = 10;

      const addressText = `${a.addressLabel}
${a.houseName}, ${a.street}
${a.city}, ${a.state} - ${a.pincode}
Phone: ${a.phone}`;

      // Measure text height
      doc.fontSize(12);
      const textHeight = doc.heightOfString(addressText, {
        width: boxWidth - padding * 2,
        lineGap: 2,
      });

      const boxHeight = textHeight + padding * 2 + 20; // title space

      // Draw box
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 8).stroke("#999");

      // Title
      doc
        .fontSize(14)
        .fillColor("#222")
        .text("Delivery Address", boxX + padding, boxY + 8);

      // Address text
      doc
        .fontSize(12)
        .fillColor("#444")
        .text(addressText, boxX + padding, boxY + 28, {
          width: boxWidth - padding * 2,
          lineGap: 2,
        });

      // Move cursor BELOW the box
      doc.y = boxY + boxHeight + 10;
    }

    // ---------------- ITEMS TABLE ----------------
    doc.fontSize(14).fillColor("#222").text("Order Items", { underline: true });

    const tableTop = doc.y + 10;
    const columnX = {
      item: 40,
      qty: 220,
      price: 290,
      subtotal: 380,
      status: 480,
    };

    doc.rect(40, tableTop, 510, 22).fill("#f2f2f2").stroke();

    doc
      .fillColor("#000")
      .fontSize(12)
      .text("Item", columnX.item, tableTop + 6)
      .text("Qty", columnX.qty, tableTop + 6)
      .text("Price", columnX.price, tableTop + 6)
      .text("Subtotal", columnX.subtotal, tableTop + 6)
      .text("Status", columnX.status, tableTop + 6);

    let posY = tableTop + 30;

    order.items.forEach((item) => {
      let statusLabel = "Delivered";
      let statusColor = "#2e7d32";

      if (item.status === "cancelled") {
        statusLabel = "Cancelled";
        statusColor = "#c62828";
      } else if (item.status === "returned") {
        statusLabel = "Returned (Refunded)";
        statusColor = "#ef6c00";
      }

      doc
        .fillColor("#333")
        .text(item.productName, columnX.item, posY)
        .text(item.quantity.toString(), columnX.qty, posY)
        .text(`₹${item.unitPrice}`, columnX.price, posY)
        .text(`₹${item.subtotal}`, columnX.subtotal, posY)
        .fillColor(statusColor)
        .text(statusLabel, columnX.status, posY);

      doc
        .moveTo(40, posY + 18)
        .lineTo(550, posY + 18)
        .stroke("#ddd");

      posY += 25;
    });

    // ---------------- SUMMARY ----------------
    const subtotal = order.items
      .filter((item) => item.status === "delivered")
      .reduce((sum, item) => sum + item.subtotal, 0);

    const discount = Number(order.discount || 0);
    const shippingCharge = Number(order.shippingCharge || 0);
    const totalPaid = Number(order.finalPayable);

    doc.roundedRect(300, posY + 10, 250, 120, 8).stroke("#999");

    doc
      .fontSize(12)
      .fillColor("#444")
      .text(`Subtotal (Delivered Items): ₹${subtotal}`, 320, posY + 25)
      .text(`Discount: ₹${discount}`, 320, posY + 45)
      .text(`Shipping: ₹${shippingCharge}`, 320, posY + 65)
      .fontSize(13)
      .fillColor("#000")
      .text(`Total Amount Paid: ₹${totalPaid}`, 320, posY + 90);

    doc.moveDown(5);

    doc
      .fontSize(10)
      .fillColor("#777")
      .text("Thank you for shopping with READNEST!", { align: "center" });

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
