import Product from "../../models/productsSchema.js";
import Category from "../../models/categorySchema.js";

export const loadProductsAdd = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true });

    const productId = req.query.id;
    let product = null;

    if (productId) {
      product = await Product.findById(productId);
    }
    res.render("addProduct", { product, categories, errors: {}, oldInput: {} });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

export const postProducts = async (req, res) => {
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
      salePrice,
      stock,
      isbnNumber,
      category,
      specialOfferType,
    } = req.body;

    let errors = {};
    const categories = await Category.find({ isListed: true });

     const imageUrls =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.path)
        : [];

    let isOfferProduct =
      specialOfferType === "combo" || specialOfferType === "rush-hour";

    if (isOfferProduct) {
      if (!productName) errors.productName = "Product Name is required.";
      if (!regularPrice) errors.regularPrice = "Regular Price is required.";
      if (!salePrice) errors.salePrice = "Sale Price is required.";
      if (!stock) errors.stock = "Stock is required.";
      if(!req.files || req.files.length < 1) errors.imageUrls = "Image is required";
    } else {
      if (!productName) errors.productName = "Product Name is required.";
      if (!description) errors.description = "Product Description is required.";
      if (!author) errors.author = "Author Name is required.";
      if (!category) errors.category = "Category is required.";
      if (!language) errors.language = "Language is required.";
      if (!regularPrice) errors.regularPrice = "Price is required.";
      if (!stock) errors.stock = "Stock is required.";
      if(!req.files || req.files.length < 1) errors.imageUrls = "Image is required";
    }

    if (Object.keys(errors).length > 0) {
      return res.render("addProduct", {
        errors,
        categories,
        oldInput: req.body,
      });
    }

   

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
      salePrice: req.body.salePrice,
      stock,
      productImage: imageUrls,
      isbnNumber,
      specialOfferType,
    });

    await newProduct.save();
    const limit = 10;
    const page = 1;
    const skip = (page - 1) * limit;

    const productData = await Product.find({})
      .sort({ productName: 1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    res.redirect("/admin/products?added=true&status=added");
  } catch (error) {
    res.redirect("/admin/products?status=error");
  }
};

export const loadEditProducts = async (req, res) => {
  try {
    const id = req.query.id;
    const categories = await Category.find({ isListed: true });
    const product = await Product.findOne({ _id: id });
    res.render("editProduct", { data: product, categories });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

export const postEditProducts = async (req, res) => {
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

    Object.keys(updatedFields).forEach(
      (key) =>
        (updatedFields[key] === undefined || updatedFields[key] === "") &&
        delete updatedFields[key]
    );

    const updateProduct = await Product.findByIdAndUpdate(id, updatedFields, {
      new: true,
      runValidators: true,
    });

    if (updateProduct) {
      res.redirect("/admin/products?status=updated");
    } else {
      res.status(400).json({ message: "Product not found" });
    }
  } catch (error) {
    res.redirect("/pageerror");
  }
};

export const productList = async (req, res) => {
  try {
    const { id, page, search, category } = req.query;

    await Product.findByIdAndUpdate(id, { isListed: true });

    res.redirect(
      `/admin/products?page=${page || 1}&search=${search || ""}&category=${
        category || ""
      }`
    );
  } catch (err) {
    res.redirect("/admin/pageerror");
  }
};

export const productUnlist = async (req, res) => {
  try {
    const { id, page, search, category } = req.query;

    await Product.findByIdAndUpdate(id, { isListed: false });

    res.redirect(
      `/admin/products?page=${page || 1}&search=${search || ""}&category=${
        category || ""
      }`
    );
  } catch (err) {
    res.redirect("/admin/pageerror");
  }
};

export const productDelete = async (req, res) => {
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
    res.redirect("/pageerror");
  }
};

export const loadFilteredProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const category = req.query.category || "";
    const offer = req.query.offer || "";
    const sort = req.query.sort || "";

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = {};

    if (search.trim() !== "") {
      query.$or = [
        { productName: new RegExp(search, "i") },
        { author: new RegExp(search, "i") },
        { language: new RegExp(search, "i") },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (offer === "rushHour") {
      query.specialOfferType = "rushHour";
    } else if (offer === "combo") {
      query.specialOfferType = "combo";
    }
    let sortQuery = {};

    switch (sort) {
      case "priceAsc":
        sortQuery = { regularPrice: 1 };
        break;

      case "priceDesc":
        sortQuery = { regularPrice: -1 };
        break;

      case "nameAsc":
        sortQuery = { productName: 1 };
        break;

      case "nameDesc":
        sortQuery = { productName: -1 };
        break;

      case "newest":
        sortQuery = { createdAt: -1 };
        break;

      case "oldest":
        sortQuery = { createdAt: 1 };
        break;

      default:
        sortQuery = {};
    }

    const data = await Product.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const categories = await Category.find();

    res.render("products", {
      data,
      categories,
      search,
      category,
      currentPage: page,
      totalPages,
      offer,
      sort,
    });
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

export const imageCropper = async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, message: "No file uploaded" });
    }

    // req.file.path = Cloudinary URL
    return res.json({
      success: true,
      url: req.file.path,
    });
  } catch (error) {
    console.error("Crop upload error:", error);
    return res.json({ success: false, message: "Upload failed" });
  }
};
