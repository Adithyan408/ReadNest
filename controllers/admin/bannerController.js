import Banner from "../../models/bannerSchema.js";

export const getBanner = async (req, res) => {
  try {
    const limit = 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const findBanner = await Banner.find({})
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Banner.countDocuments();
    const totalPages = Math.ceil(total / limit);
    res.render("banner", { data: findBanner,  currentPage:page, totalPages });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

export const getBannerAdd = async (req, res) => {
  try {
    res.render("addBanner",
       {errors:{},
        oldInput:{}
    }
    );
  } catch (error) {}
};

export const bannerAdd = async (req, res) => {
  try {
    const { title, startDate, endDate, status } = req.body;
    let errors = {};

     if (!title || title.trim() === "") {
      errors.title = "Banner title is required.";
    }

    if (!startDate) {
      errors.startDate = "Start Date is required.";
    }

    if (!endDate) {
      errors.endDate = "End Date is required.";
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      errors.dateRange = "Start Date cannot be after End Date.";
    }

    if (!status) {
      errors.status = "Please select a banner status.";
    }

    if (!req.file) {
      errors.bannerImage = "Banner image is required.";
    }

    if (Object.keys(errors).length > 0) {
      return res.render("addBanner", {
        errors,
        oldInput: req.body
      });
    }

    const imageUrl = req.file ? req.file.path : null;
    const newBanner = new Banner({
      title,
      bannerImage: imageUrl,
      startDate,
      endDate,
      status,
    });
    await newBanner.save();
    res.redirect("/admin/banner?status=added");
  } catch (error) {
    console.log("Banner adding error", error);
    res.redirect("/pageerror");
  }
};

export const geteditBanner = async (req, res) => {
  try {
    const id = req.query.id;

    const banner = await Banner.findOne({ _id: id });
    res.render("editBanner", { data: banner });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

export const editBanner = async (req, res) => {
  try {
    const id = req.query.id;
    const { title, startDate, endDate, status } = req.body;
    const newImageUrl = req.file ? req.file.path : null;

    const updatedData = {
      title,
      startDate,
      endDate,
      status,
    };
    if (newImageUrl) {
      updatedData.bannerImage = newImageUrl;
    }

    const updateBanner = await Banner.findByIdAndUpdate(id, updatedData, {
      new: true,
    });
    if (updateBanner) {
      res.redirect("/admin/banner?status=updated");
    } else {
      res.json({ message: "Something went wrong when editing" });
    }
  } catch (error) {
    res.redirect("/pageerror");
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).send("Category ID not provided");
    }

    const deletedBanner = await Banner.findByIdAndDelete(id);
    console.log(deleteBanner);

    if (!deletedBanner) {
      return res.status(404).send("Banner not found");
    }
    res.redirect("/admin/banner?deleted=true&status=deleted");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};
