import Order from '../../models/orderSchema.js';
import Product from '../../models/productsSchema.js';
import Coupon from '../../models/couponSchema.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { creditWallet } from '../../middlewares/walletHandler.js';
import { ERROR_MESSAGES } from '../../helpers/errorMessages.js';
import { HttpStatus } from '../../helpers/statusCodes.js';

export const getOrderDetailsPage = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findOne({ orderId })
      .populate('items.product', 'productImage')
      .lean();

    if (!order) return res.status(HttpStatus.NOT_FOUND).render('notFound');

    order.items = order.items.map((item) => ({
      ...item,
      canCancel: item.status === 'ordered' || item.status === 'shipped',
      canReturn: item.status === 'delivered',
    }));

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    let isInvoiceAvailable = false;

    const allItemsCancelled = order.items.every(
      (item) => item.status === 'cancelled',
    );

    if (!allItemsCancelled) {
      if (order.paymentMethod === 'COD') {
        isInvoiceAvailable = order.items.some(
          (item) => item.status === 'delivered',
        );
      } else {
        isInvoiceAvailable = true;
      }
    }

    let canCancelIndividually = true;

    if (order.couponCode) {
      const coupon = await Coupon.findOne({
        code: order.couponCode,
      });

      if (coupon) {
        const activeSubtotal = order.items
          .filter((i) => !['cancelled', 'returned'].includes(i.status))
          .reduce((sum, i) => sum + i.finalAmount, 0);

        if (activeSubtotal < coupon.minPurchase) {
          canCancelIndividually = false;
        }
      }
    }

    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    const isRetryEligible =
      order.paymentStatus === 'failed' &&
      !['cancelled'].includes(order.status) &&
      Date.now() - new Date(order.createdAt).getTime() <= SEVEN_DAYS;

    return res.render('orderDetails', {
      order,
      selectedAddress: order.address,
      isInvoiceAvailable,
      canCancelIndividually,
      isRetryEligible,
    });
  } catch (err) {
    console.error('Order Details Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('notFound');
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

export const cancelOrderItem = async (req, res) => {
  try {
    const safeNumber = (val) => {
      const num = Number(val);
      return Number.isFinite(num) ? num : 0;
    };

    const { orderId, itemId } = req.params;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Order not found',
      });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Item not found',
      });
    }

    if (!['ordered', 'shipped'].includes(item.status)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Item cannot be cancelled at this stage',
      });
    }

    const activeItems = order.items.filter(
      (i) => !['cancelled', 'returned'].includes(i.status),
    );

    const subtotalBefore = activeItems.reduce(
      (sum, i) => sum + safeNumber(i.subtotal),
      0,
    );

    const itemBaseAmount = safeNumber(item.subtotal); 

    const subtotalAfter = subtotalBefore - itemBaseAmount;

    if (order.couponCode) {
      const coupon = await Coupon.findOne({ code: order.couponCode });

      if (
        coupon &&
        subtotalAfter < coupon.minPurchase &&
        activeItems.length > 1
      ) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          reason: 'COUPON_MIN_BREAK',
          message:
            'This item cannot be cancelled individually due to coupon conditions. Please cancel the full order.',
        });
      }
    }

    const discountBefore = safeNumber(order.discount);
    let discountAfter = discountBefore;

    if (order.couponCode) {
      const coupon = await Coupon.findOne({ code: order.couponCode });
      if (coupon) {
        discountAfter = calculateDiscount(subtotalAfter, coupon);
      }
    }

    const discountDifference = Math.max(
      discountBefore - safeNumber(discountAfter),
      0,
    );

    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } },
    );

    item.status = 'cancelled';
    item.cancelledAt = new Date();

    const remainingItems = activeItems.filter(
      (i) => i._id.toString() !== itemId,
    );

    const isLastItem = remainingItems.length === 0;

    let shippingRefund = 0;

    if (isLastItem && item.status !== 'delivered') {
      shippingRefund = safeNumber(order.shippingCharge);
    }

    const couponBrokenByThisCancellation =
      order.couponCode && discountBefore > 0 && discountAfter === 0;

    let refundAmount;

    if (isLastItem) {
      refundAmount = itemBaseAmount - discountBefore + shippingRefund;
    } else if (couponBrokenByThisCancellation) {
      refundAmount = Math.max(itemBaseAmount - discountDifference, 0);
    } else {
      refundAmount = itemBaseAmount;
    }

    order.discount = safeNumber(discountAfter);
    order.payableAmount = Math.max(
      safeNumber(order.payableAmount) - refundAmount,
      0,
    );

    if (isLastItem) {
      order.discount = 0;
      order.shippingCharge = 0;
    }

    order.status =
      remainingItems.length === 0 ? 'cancelled' : 'partially_cancelled';

    await order.save();

    if (['Razorpay', 'WALLET'].includes(order.paymentMethod)) {
      await creditWallet({
        userId: order.user,
        amount: refundAmount,
        note: 'Refund after item cancellation (coupon adjusted)',
        orderId: order.orderId.toString(),
        paymentId: order.paymentId || null,
        source: 'cancel_refund',
      });
    }

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Item cancelled successfully',
    });
  } catch (err) {
    console.error('Cancel Order Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const cancelFullOrder = async (req, res) => {
  try {
    const safeNumber = (val) => {
      const num = Number(val);
      return Number.isFinite(num) ? num : 0;
    };

    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status === 'cancelled') {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Order is already cancelled',
      });
    }

    if (!order.couponCode) {
      return res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        message: 'Full order cancellation is allowed only for coupon orders',
      });
    }

    let refundAmount = safeNumber(order.payableAmount ?? order.finalPayable);

    for (const item of order.items) {
      if (!['cancelled', 'returned'].includes(item.status)) {
        item.status = 'cancelled';
        item.cancelledAt = new Date();

        const itemAmount = safeNumber(item.finalAmount || item.subtotal);
        item.refundAmount = itemAmount;

        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } },
        );
      }
    }

    order.discount = 0;
    order.payableAmount = 0;
    order.status = 'cancelled';

    await order.save();

    if (['Razorpay', 'WALLET'].includes(order.paymentMethod)) {
      await creditWallet({
        userId: order.user,
        amount: refundAmount,
        note: 'Full order cancellation refund',
        orderId: order.orderId.toString(),
        paymentId: order.paymentId || null,
        source: 'full_order_cancel',
      });
    }

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Order cancelled successfully',
    });
  } catch (err) {
    console.error('Full Order Cancel Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const returnOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { returnReason } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) return res.render('notFound');

    const item = order.items.id(itemId);
    if (!item || item.status !== 'delivered') {
      return res.status(HttpStatus.NOT_FOUND).render('notFound');
    }

    if (item.returnStatus !== 'none') {
      return res.status(HttpStatus.BAD_REQUEST).redirect(`/orders/${orderId}`);
    }

    item.returnStatus = 'requested';
    item.returnReason = returnReason;

    await order.save();

    res.redirect(`/orders/${orderId}`);
  } catch (err) {
    console.log('Return Item Error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('notFound');
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId }).lean();
    if (!order) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.ORDER.NOT_FOUND,
      });
    }

    const allItemsCancelled = order.items.every(
      (item) => item.status === 'cancelled',
    );

    if (order.status === 'cancelled' || allItemsCancelled) {
      return res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        message: 'Invoice not available for cancelled orders',
      });
    }

    let isInvoiceAvailable = false;

    if (order.paymentMethod === 'COD') {
      isInvoiceAvailable = order.items.some(
        (item) => item.status === 'delivered',
      );
    } else {
      isInvoiceAvailable = true;
    }

    if (!isInvoiceAvailable) {
      return res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        message: 'Invoice is available only after delivery',
      });
    }

    // ---------------- PDF SETUP ----------------
    const invoiceName = `invoice-${orderId}.pdf`;
    const invoiceDir = 'invoices';
    const invoicePath = path.join(invoiceDir, invoiceName);

    if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir);

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoiceName}"`);

    doc.pipe(fs.createWriteStream(invoicePath));
    doc.pipe(res);

    // ---------------- HEADER ----------------
    const logoPath = path.join('public', 'images', 'logo2.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 30, { width: 70 });
    }

    doc.fontSize(26).fillColor('#333').text('READNEST', { align: 'center' });
    doc.fontSize(12).fillColor('#666').text('Digital Book Store', {
      align: 'center',
    });

    doc.moveTo(40, 100).lineTo(550, 100).stroke('#ccc');
    doc.moveDown(2);

    doc.fontSize(20).fillColor('#222').text('INVOICE', { align: 'center' });
    doc.moveDown(1);

    doc
      .fontSize(12)
      .fillColor('#444')
      .text(`Order ID: ${order.orderId}`, { align: 'center' })
      .text(`Order Date: ${new Date(order.createdAt).toLocaleString()}`, {
        align: 'center',
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
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 8).stroke('#999');

      // Title
      doc
        .fontSize(14)
        .fillColor('#222')
        .text('Delivery Address', boxX + padding, boxY + 8);

      // Address text
      doc
        .fontSize(12)
        .fillColor('#444')
        .text(addressText, boxX + padding, boxY + 28, {
          width: boxWidth - padding * 2,
          lineGap: 2,
        });

      // Move cursor BELOW the box
      doc.y = boxY + boxHeight + 10;
    }

    // ---------------- ITEMS TABLE ----------------
    doc.fontSize(14).fillColor('#222').text('Order Items', { underline: true });

    const tableTop = doc.y + 10;
    const columnX = {
      item: 40,
      qty: 220,
      price: 290,
      subtotal: 380,
      status: 480,
    };

    doc.rect(40, tableTop, 510, 22).fill('#f2f2f2').stroke();

    doc
      .fillColor('#000')
      .fontSize(12)
      .text('Item', columnX.item, tableTop + 6)
      .text('Qty', columnX.qty, tableTop + 6)
      .text('Price', columnX.price, tableTop + 6)
      .text('Subtotal', columnX.subtotal, tableTop + 6)
      .text('Status', columnX.status, tableTop + 6);

    let posY = tableTop + 30;

    order.items.forEach((item) => {
      let statusLabel = '';
      let statusColor = '#555';

      switch (item.status) {
        case 'ordered':
        case 'placed':
          statusLabel = 'Order Placed';
          statusColor = '#1565c0'; // blue
          break;

        case 'shipped':
          statusLabel = 'Shipped';
          statusColor = '#6a1b9a'; // purple
          break;

        case 'delivered':
          statusLabel = 'Delivered';
          statusColor = '#2e7d32'; // green
          break;

        case 'returned':
          statusLabel = 'Returned (Refunded)';
          statusColor = '#ef6c00'; // orange
          break;

        case 'cancelled':
          statusLabel = 'Cancelled';
          statusColor = '#c62828'; // red
          break;

        default:
          statusLabel = 'Processing';
          statusColor = '#555';
      }

      doc
        .fillColor('#333')
        .text(item.productName, columnX.item, posY)
        .text(item.quantity.toString(), columnX.qty, posY)
        .text(`₹${item.unitPrice}`, columnX.price, posY)
        .text(`₹${item.subtotal}`, columnX.subtotal, posY)
        .fillColor(statusColor)
        .text(statusLabel, columnX.status, posY);

      doc
        .moveTo(40, posY + 18)
        .lineTo(550, posY + 18)
        .stroke('#ddd');

      posY += 25;
    });

    // ---------------- SUMMARY ----------------
    const subtotal = order.items
      .filter((item) => item.status === 'delivered')
      .reduce((sum, item) => sum + item.subtotal, 0);

    const discount = Number(order.discount || 0);
    const shippingCharge = Number(order.shippingCharge || 0);
    const totalPaid = Number(order.finalPayable);

    doc.roundedRect(300, posY + 10, 250, 120, 8).stroke('#999');

    doc
      .fontSize(12)
      .fillColor('#444')
      .text(`Subtotal (Delivered Items): ₹${subtotal}`, 320, posY + 25)
      .text(`Discount: ₹${discount}`, 320, posY + 45)
      .text(`Shipping: ₹${shippingCharge}`, 320, posY + 65)
      .fontSize(13)
      .fillColor('#000')
      .text(`Total Amount Paid: ₹${totalPaid}`, 320, posY + 90);

    doc.moveDown(5);

    doc
      .fontSize(10)
      .fillColor('#777')
      .text('Thank you for shopping with READNEST!', { align: 'center' });

    doc.end();
  } catch (error) {
    console.log('Invoice Error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('notFound');
  }
};

export const getListOrders = async (req, res) => {
  try {
    const sessionUser = req.session.user;

    if (!sessionUser) {
      return res.redirect('/login');
    }

    const userId = sessionUser._id;
    const search = req.query.search?.trim() || '';

    let query = {
      user: userId,
    };

    if (search) {
      query.orderId = { $regex: search, $options: 'i' };
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    let noResultsMessage = null;
    if (search && orders.length === 0) {
      noResultsMessage = `No orders found with Order ID "${search}"`;
    }

    res.render('orders', {
      user: sessionUser,
      orders,
      search,
      noResultsMessage,
    });
  } catch (err) {
    console.error('Orders Page Error:', err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).render('notFound');
  }
};