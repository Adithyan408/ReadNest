import Blog from "../../models/blogSchema.js";
import sanitizeHtml from "sanitize-html";

export const listBlog = async (req, res) => {
  try {
    const blog = await Blog.find({})
    .populate("author", "name") 
    .sort({ createdAt: -1 })
    .lean();
    res.render("blog", { blogs: blog });
  } catch (error) {}
};

export const singleBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id)
    .populate("author", "name email")
    .lean();

    if (!blog) {
      return res.status(404).render("404", {
        message: "Blog not found",
      });
    }

    res.render("blog-details", { blog });
  } catch (error) {
    console.error(error);
    res.status(500).render("error", {
      message: "Failed to load blog",
    });
  }
};

export const loadCreateBlog = async (req, res) => {
  try {
    res.render("createBlog");
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load page");
  }
};

export const createBlog = async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).send("All fields are required");
    }

    const cleanContent = sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        "img",
        "h1",
        "h2",
        "h3",
      ]),
      allowedAttributes: {
        "*": ["style"],
        img: ["src", "alt"],
      },
    });

    await Blog.create({
      title,
      content: cleanContent,
      author: req.session.user._id,
    });

    res.redirect("/blog");
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to create blog");
  }
};
