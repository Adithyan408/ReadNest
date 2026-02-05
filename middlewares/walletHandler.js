import Wallet from '../models/walletSchema.js';

export const creditWallet = async ({
  userId,
  amount,
  note,
  orderId = null,
  paymentId = null,
  itemId = null,      
  source = 'refund',  
}) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    console.log('Invalid wallet credit amount:', amount);
    return;
  }

  const wallet = await Wallet.findOne({ user: userId });

  if (wallet && wallet.transactions?.length) {
    const isDuplicate = wallet.transactions.some((tx) => {
 
      if (paymentId && source === 'webhook_refund') {
        return tx.paymentId === paymentId && tx.source === source;
      }

      if (paymentId && itemId) {
        return (
          tx.paymentId === paymentId &&
          tx.itemId?.toString() === itemId &&
          tx.source === source
        );
      }

      return false;
    });

    if (isDuplicate) {
      console.log('Duplicate wallet credit prevented:', {
        paymentId,
        itemId,
        source,
      });
      return;
    }
  }

  await Wallet.findOneAndUpdate(
    { user: userId },
    {
      $inc: { balance: amount },
      $push: {
        transactions: {
          type: 'credit',
          source,
          amount,
          note,
          orderId,
          paymentId,
          itemId,         
          date: new Date(),
        },
      },
    },
    { upsert: true, new: true },
  );
};

export const calculateRefundAmount = (
  item,
  orderShipping = 0,
  deductShipping = false,
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
 
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid wallet debit amount');
  }

  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  if (wallet.balance < amount) {
    throw new Error('Insufficient wallet balance');
  }

  wallet.balance = Number(wallet.balance) - Number(amount);

  wallet.transactions.push({
    type: 'debit',
    amount: Number(amount),
    note,
    orderId,
    paymentId,
  });

  await wallet.save();

  return {
    balance: wallet.balance,
    debitedAmount: amount,
  };
};
