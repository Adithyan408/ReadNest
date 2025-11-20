// import mongoose from "mongoose";
// import Product from "./models/productsSchema.js";
// import Category from "./models/categorySchema.js";

// mongoose.connect("mongodb://localhost:27017/readnest");

// const run = async () => {
//   const products = await Product.find();

//   for (const product of products) {
//     const catName = product.category;

//     // skip if already ObjectId
//     if (mongoose.Types.ObjectId.isValid(catName)) continue;

//     const category = await Category.findOne({ categoryName: catName });

//     if (category) {
//       product.category = category._id;
//       await product.save();
//       console.log(`Updated product: ${product.productName}`);
//     } else {
//       console.log(`Category not found for: ${product.productName}`);
//     }
//   }

//   console.log("Migration complete");
//   process.exit();
// };

// run();
