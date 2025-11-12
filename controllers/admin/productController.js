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
    res.render("addProduct", { product, categories });
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
      language,
      description,
      author,
      authorDescription,
      publisher,
      yearOfPublishing,
      pages,
      regularPrice,
      stock,
      isbnNumber,
    } = req.body;

    const imageUrls = req.files.map((file) => file.path);

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
      stock,
      productImage: imageUrls,
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

export const geteditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const categories = await Category.find({ isListed: true });
    const product = await Product.findOne({ _id: id });
    res.render("editProduct", { data: product, categories });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

export const editProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const existingProduct = await Product.findById(id);
    const newImageUrls =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.path)
        : [];
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
      stock,
      isbnNumber,
    } = req.body;

    const updatedFields = {
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
      stock,
      isbnNumber,
    };

    if (newImageUrls.length > 0) {
      updatedFields.productImage = newImageUrls;
    } else {
      updatedFields.productImage = existingProduct.productImage;
    }

    // Remove undefined or empty string fields to prevent overwriting
    Object.keys(updatedFields).forEach(
      (key) =>
        (updatedFields[key] === undefined || updatedFields[key] === "") &&
        delete updatedFields[key]
    );

    const updateProduct = await Product.findByIdAndUpdate(id, updatedFields, {
      new: true, // returns updated doc
      runValidators: true, // ensures schema validation
    });

    if (updateProduct) {
      res.redirect("/admin/products");
    } else {
      res.status(400).json({ message: "Product not found" });
    }
  } catch (error) {
    console.error("Error editing product:", error);
    res.redirect("/pageerror");
  }
};

export const listProduct = async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.query.id, { isListed: true });
    res.redirect("/admin/products");
  } catch (err) {
    res.redirect("admin/pageerror");
  }
};


export const unlistProduct = async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.query.id, { isListed: false });
    res.redirect("/admin/products");
  } catch (err) {
    res.redirect("admin/pageerror");
  }
};



export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).send("Category ID not provided");
    }

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).send("Category not found");
    }
    res.redirect("/admin/products?deleted=true");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};