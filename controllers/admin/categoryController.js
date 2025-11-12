import Category from "../../models/categorySchema.js";

export const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const categoryData = await Category.find({})
      .sort({ categoryNumber: 1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);
    res.render("category", {
      data: categoryData,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

export const addCategory = async (req, res) => {
  const { categoryName, categoryNumber } = req.body;
  try {
    if (!categoryName || !categoryNumber) {
      return res.status(400).render("addCategory", {
        errorMessage: "Both category name and number are required.",
        category: { categoryName, categoryNumber },
      });
    }

    const existingCategory = await Category.findOne({
      $or: [{ categoryName }, { categoryNumber }],
    });
    if (existingCategory) {
      return res.status(400).render("addCategory", {
        errorMessage: "Category already exists.",
        category: { categoryName, categoryNumber },
      });
    }

    const newCategory = new Category({
      categoryName,
      categoryNumber,
    });
    await newCategory.save();

    const limit = 4;
    const page = 1;
    const skip = (page - 1) * limit;

    const categories = await Category.find({})
      .sort({ categoryNumber: 1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);

    return res.render("category", {
      data: categories,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const categoryAdd = async (req, res) => {
  try {
    const categoryId = req.query.id;
    let category = null;

    if (categoryId) {
      category = await Category.findById(categoryId);
    }

    res.render("addCategory", { category });
  } catch (error) {
    console.log("Error loading addCategory page:", error.message);
    res.redirect("/pageerror");
  }
};

export const listCategory = async (req, res) => {
  try {
    await Category.findByIdAndUpdate(req.query.id, { isListed: true });
    res.redirect("/admin/category");
  } catch (err) {
    res.redirect("admin/pageerror");
  }
};

export const unlistCategory = async (req, res) => {
  try {
    await Category.findByIdAndUpdate(req.query.id, { isListed: false });
    res.redirect("/admin/category");
  } catch (err) {
    res.redirect("admin/pageerror");
  }
};

export const geteditCategory = async (req, res) => {
  try {
    const id = req.query.id;

    const category = await Category.findOne({ _id: id });
    res.render("editCategory", { category });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

export const editCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const { categoryName, categoryNumber, stock, sales } = req.body;
    const updateCategory = await Category.findByIdAndUpdate(
      id,
      {
        categoryName,
        categoryNumber,
        stock,
        sales
      },
      { new: true }
    );
    if (updateCategory) {
      res.redirect("/admin/category");
    } else {
        res.json({message:"Something went wrong when editing"})
    }
  } catch (error) {
    res.redirect("/pageerror");
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).send("Category ID not provided");
    }

    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).send("Category not found");
    }
    res.redirect("/admin/category"); 
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};