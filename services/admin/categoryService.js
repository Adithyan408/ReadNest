import Category from "../../models/categorySchema.js";

export const categoryLoad = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";

    const query = {};

    if (search.trim() !== "") {
      query.categoryName = { $regex: search, $options: "i" };
    }

    const categoryData = await Category.find(query)
      .sort({ categoryName: 1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments(query);
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("category", {
      data: categoryData,
      currentPage: page,
      totalPages,
      totalCategories,
      limit,
      search,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

export const postCategory = async (req, res) => {
  const { categoryName, isOffer, discountValue, startDate, endDate } = req.body;
  try {
    if (!categoryName) {
      return res.status(400).render("addCategory", {
        errorMessage: "Both category name and number are required.",
        category: { categoryName },
      });
    }
    console.log("offer:", isOffer);
    console.log("offer:", discountValue);
    const existingCategory = await Category.findOne({ categoryName });
    if (existingCategory) {
      return res.status(400).render("addCategory", {
        errorMessage: "Category already exists.",
        category: { categoryName },
      });
    }

    const newCategory = new Category({
      categoryName,
      offer: {
        isOffer: isOffer === "true",
        discountValue: isOffer === "true" ? Number(discountValue) : 0,
        startDate: isOffer === "true" && startDate ? new Date(startDate) : null,
        endDate: isOffer === "true" && endDate ? new Date(endDate) : null,
      },
    });

    await newCategory.save();

    const limit = 4;
    const page = 1;
    const skip = (page - 1) * limit;

    const categories = await Category.find({})
      .sort({ categoryName: 1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);

    return res.render("category", {
      data: categories,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories,
      status: "added",
      limit,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getCategory = async (req, res) => {
  try {
    const categoryId = req.query.id;
    let category = null;

    if (categoryId) {
      category = await Category.findById(categoryId);
    }

    res.render("addCategory", { category });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

export const getListCategory = async (req, res) => {
  try {
    const page = req.query.page || 1;

    await Category.findByIdAndUpdate(req.query.id, { isListed: true });

    res.redirect(`/admin/category?page=${page}`);
  } catch (err) {
    res.redirect("/admin/pageerror");
  }
};

export const getunlistCategory = async (req, res) => {
  try {
    const page = req.query.page || 1;

    await Category.findByIdAndUpdate(req.query.id, { isListed: false });

    res.redirect(`/admin/category?page=${page}`);
  } catch (err) {
    res.redirect("/admin/pageerror");
  }
};

export const getEditCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const category = await Category.findOne({ _id: id });

    const formattedCategory = {
      ...category._doc,
      startDate: category.startDate
        ? category.startDate.toISOString().split("T")[0]
        : "",
      endDate: category.endDate
        ? category.endDate.toISOString().split("T")[0]
        : "",
    };

    res.render("editCategory", { category: formattedCategory });
  } catch (error) {
    console.log(error);
    res.redirect("/pageerror");
  }
};

export const postEditCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const { categoryName, isOffer, discountValue, startDate, endDate } =
      req.body;

    const updatedFields = {
      categoryName,
      offer: {},
    };

    if (isOffer === "true") {
      updatedFields.offer.isOffer = true;
      updatedFields.offer.discountValue = Number(discountValue);
      updatedFields.offer.startDate = startDate ? new Date(startDate) : null;
      updatedFields.offer.endDate = endDate ? new Date(endDate) : null;
    } else {
      updatedFields.offer.isOffer = false;
      updatedFields.offer.discountValue = 0;
      updatedFields.offer.startDate = null;
      updatedFields.offer.endDate = null;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updatedFields,
      { new: true }
    );

    if (updatedCategory) {
      return res.redirect("/admin/category?status=updated");
    } else {
      return res.json({ message: "Something went wrong when editing" });
    }
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

export const categoryDelete = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).send("Category ID not provided");
    }

    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).send("Category not found");
    }
    res.redirect("/admin/category?deleted=true&status=deleted");
  } catch (error) {
    res.redirect("/pageerror");
  }
};
