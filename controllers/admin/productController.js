import Product from "../../models/productsSchema.js";
import Category from "../../models/categorySchema.js";

export const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const productData = await Product.find({})
      .sort({ productName: 1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
    res.render("products", {
      data: productData,
      currentPage: page,
      totalPages: totalPages,
      totalProducts: totalProducts,
    });
  } catch (error) {
    console.log(error);
    res.redirect("/admin/pageerror");
  }
};

export const getProductsAdd = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true });
   
    const productId = req.query.id;
    let product = null;

    if (productId) {
      product = await Product.findById(productId);
    }
    res.render("addProduct", { product, categories});
  } catch (error) {
    console.log("Add product page rendering error : ", error);
    res.redirect("/pageerror");
  }
};

export const productsAdd = async (req, res) => {
  console.log(req.body); //logger
  console.log(req.file);

  try {
    const {
      productName,
      productNumber,
      category,
      language,
      description,
      author,
      authorDescription,
      publisher,
      yearOfPublishing,
      pages,
      regularPrice,
      quantity,
      isbnNumber,
    } = req.body;

    const productImage = req.file?.path;

    const newProduct = new Product({
      productName,
      productNumber,
      category: req.body.category,
      language,
      description,
      author,
      authorDescription,
      publisher,
      yearOfPublishing,
      pages,
      regularPrice,
      quantity,
      productImage,
      isbnNumber,
    });

    await newProduct.save();
    console.log("new Product: ", newProduct); //logger

    const limit = 5;
    const page = 1;
    const skip = (page - 1) * limit;

    const productData = await Product.find({})
      .sort({ productName: 1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    await newProduct.save();
    console.log("New Product Added:", newProduct);

    // ✅ Redirect to products page instead of rendering
    res.redirect("/admin/products?added=true");
  } catch (error) {
    console.log("Product entry error", error); //logger
  }
};
