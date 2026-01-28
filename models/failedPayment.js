import mongoose from 'mongoose';

const paymentAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: Number,
        unitPrice: Number,
      },
    ],

    subtotal: Number,
    discount: Number,
    shippingCharge: Number,
    finalPayable: Number,

    couponCode: String,

    paymentMethod: {
      type: String,
      enum: ['Razorpay', 'WALLET'],
    },

    failureReason: String,

    gatewayOrderId: String,
    gatewayPaymentId: String,

    retryCount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ['failed', 'converted', 'expired'],
      default: 'failed',
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

const paymentAttempt = mongoose.model('paymentAttempt', paymentAttemptSchema);
export default paymentAttempt;

