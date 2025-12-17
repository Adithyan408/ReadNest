import Wallet from "../models/walletSchema.js";

export const creditWallet = async ({
  userId,
  amount,
  note,
  orderId = null,
  paymentId = null,
  source = "refund", // refund | topup
}) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    console.log("Invalid wallet credit amount:", amount);
    return;
  }

  const wallet = await Wallet.findOne({ user: userId });

  // 🔐 Prevent duplicate Razorpay credits
  if (
    paymentId &&
    wallet?.transactions?.some((tx) => tx.paymentId === paymentId)
  ) {
    return;
  }

  await Wallet.findOneAndUpdate(
    { user: userId },
    {
      $inc: { balance: amount },
      $push: {
        transactions: {
          type: "credit",
          source, // ✅ NEW
          amount,
          note,
          orderId,
          paymentId,
          date: new Date(),
        },
      },
    },
    { upsert: true, new: true }
  );
};

export const calculateRefundAmount = (
  item,
  orderShipping = 0,
  deductShipping = false
) => {
  let refund = Number(item.subtotal || 0);

  if (!Number.isFinite(refund)) return 0;

  if (!deductShipping) {
    refund += Number(orderShipping || 0);
  }

  if (deductShipping) {
    refund -= Number(item.shippingShare || orderShipping || 20);
  }

  return Math.max(refund, 0);
};


/**
 * Debit amount from user's wallet
 * Used for WALLET order payments
 */
export const debitWallet = async ({
  userId,
  amount,
  note,
  orderId = null,
  paymentId = null,
}) => {
  // 1️⃣ Validate amount
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid wallet debit amount");
  }

  // 2️⃣ Fetch wallet
  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  // 3️⃣ Balance check
  if (wallet.balance < amount) {
    throw new Error("Insufficient wallet balance");
  }

  // 4️⃣ Debit wallet
  wallet.balance = Number(wallet.balance) - Number(amount);

  // 5️⃣ Record transaction
  wallet.transactions.push({
    type: "debit",
    amount: Number(amount),
    note,
    orderId,
    paymentId,
  });

  // 6️⃣ Save
  await wallet.save();

  return {
    balance: wallet.balance,
    debitedAmount: amount,
  };
};
