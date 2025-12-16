import Wallet from "../../models/walletSchema.js";

export const loadWallet = async (req, res) => {
  try {
    const userId = req.session.user._id;

    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = await Wallet.create({ user: userId });
    }


    let totalRefunds = 0;
    let totalSpent = 0;
    let totalAdded = 0;

    wallet.transactions.forEach(tx => {
      if (tx.type === "credit") {
        totalAdded += tx.amount;

        if (tx.note?.toLowerCase().includes("refund")) {
          totalRefunds += tx.amount;
        }
      }

      if (tx.type === "debit") {
        totalSpent += tx.amount;
      }
    });

    res.render("wallet", {
      wallet,
      totalRefunds,
      totalSpent,
      totalAdded
    });
  } catch (err) {
    console.error(err);
    res.redirect("/500");
  }
};
