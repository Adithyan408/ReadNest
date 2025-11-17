import Product from "../../models/productsSchema.js";
import Category from "../../models/categorySchema.js";

export const getProducts = async (req, res) => {
  //   try {
  //     const page = parseInt(req.query.page) || 1;
  //     const limit = 10;
  //     const skip = (page - 1) * limit;
  //     const productData = await Product.find({})
  //       .sort({ productName: 1 })
  //       .skip(skip)
  //       .limit(limit);
  //       const categories = await Category.find({ isListed: true });
  //     const totalProducts = await Product.countDocuments();
  //     const totalPages = Math.ceil(totalProducts / limit);
  //     res.render("products", {
  //       data: productData,
  //       currentPage: page,
  //       totalPages: totalPages,
  //       totalProducts: totalProducts,
  //       categories,
  //       category: "",
  //       search: ""
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     res.redirect("/admin/pageerror");
  //   }
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
      category,
    } = req.body;

    if (
      !productName ||
      !description ||
      !category ||
      !language ||
      !regularPrice
    ) {
      const categories = await Category.find({ isListed: true });
      const errorMessage = "Please fill all required fields.";
      return res.render("addProduct", { errorMessage, categories });
    }

    const imageUrls =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.path)
        : [];

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

    const limit = 10;
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
    res.redirect("/admin/products?added=true&status=added");
  } catch (error) {
    res.redirect("/admin/products?status=error");
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
      res.redirect("/admin/products?status=updated");
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
    const { id, page, search, category } = req.query;

    await Product.findByIdAndUpdate(id, { isListed: true });

    res.redirect(`/admin/products?page=${page || 1}&search=${search || ""}&category=${category || ""}`);
  } catch (err) {
    res.redirect("/admin/pageerror");
  }
};


export const unlistProduct = async (req, res) => {
  try {
    const { id, page, search, category } = req.query;

    await Product.findByIdAndUpdate(id, { isListed: false });

    res.redirect(`/admin/products?page=${page || 1}&search=${search || ""}&category=${category || ""}`);
  } catch (err) {
    res.redirect("/admin/pageerror");
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
    res.redirect("/admin/products?deleted=true&status=deleted");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

export const getFilteredProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const category = req.query.category || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = {};

    // 🔍 SEARCH CONDITION
    if (search.trim() !== "") {
      query.$or = [
        { productName: new RegExp(search, "i") },
        { author: new RegExp(search, "i") },
        { language: new RegExp(search, "i") }
      ];
    }

    // 📂 CATEGORY FILTER
    if (category) {
      query.category = category;
    }

    // 🟦 FETCH FILTERED PRODUCTS WITH PAGINATION
    const data = await Product.find(query)
      .sort({ productName: 1 })
      .skip(skip)
      .limit(limit);

    // 📌 Count total filtered products
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    // 📌 Categories for dropdown
    const categories = await Category.find();

    res.render("products", {
      data,
      categories,
      search,
      category,
      currentPage: page,
      totalPages
    });

  } catch (error) {
    console.log("Filter error:", error);
    res.redirect("/admin/pageerror");
  }
};
;
