import Blog from "../../models/blogSchema.js";
import sanitizeHtml from "sanitize-html";
import BlogLike from "../../models/blogLikeSchema.js";
import BlogComment from "../../models/blogCommentSchema.js";
import User from "../../models/userSchema.js";

export const listBlog = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    const blogs = await Blog.find()
      .populate("author", "name")
      .sort({ createdAt: -1 })
      .lean();

    const blogIds = blogs.map((b) => b._id);

    const likeAgg = await BlogLike.aggregate([
      { $match: { blog: { $in: blogIds } } },
      { $group: { _id: "$blog", count: { $sum: 1 } } },
    ]);

    const commentAgg = await BlogComment.aggregate([
      { $match: { blog: { $in: blogIds } } },
      { $group: { _id: "$blog", count: { $sum: 1 } } },
    ]);

    const userLikes = userId
      ? await BlogLike.find({ user: userId, blog: { $in: blogIds } }).lean()
      : [];

    const likedBlogIds = new Set(userLikes.map((like) => like.blog.toString()));

    const likeMap = {};
    likeAgg.forEach((l) => (likeMap[l._id] = l.count));

    const commentMap = {};
    commentAgg.forEach((c) => (commentMap[c._id] = c.count));

    blogs.forEach((blog) => {
      blog.likeCount = likeMap[blog._id] || 0;
      blog.commentCount = commentMap[blog._id] || 0;
      blog.userLiked = likedBlogIds.has(blog._id.toString());
    });

    const user = await User.findById(userId);

    res.render("blog", {
      blogs,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to load blogs");
  }
};

export const singleBlog = async (req, res) => {
  try {
    const blogId = req.params.id;
    const userId = req.session.user?._id;

    const blog = await Blog.findById(blogId)
      .populate("author", "name email")
      .lean();

    if (!blog) {
      return res.send("error");
    }

    const likeCount = await BlogLike.countDocuments({ blog: blogId });
    const userLiked = userId
      ? await BlogLike.exists({ blog: blogId, user: userId })
      : false;

    const comments = await BlogComment.find({ blog: blogId })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.render("blog-details", {
      blog,
      likeCount,
      userLiked,
      comments,
    });
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

export const toggleBlogLike = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { blogId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false });
    }

    const existingLike = await BlogLike.findOne({
      blog: blogId,
      user: userId,
    });
    if (existingLike) {
      await BlogLike.deleteOne({ _id: existingLike._id });
      return res.json({ liked: false });
    }

    await BlogLike.create({
      blog: blogId,
      user: userId,
    });
    res.json({ liked: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

export const addComment = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { blogId, comment } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false });
    }
    if (!comment.trim()) {
      return res.status(401).json({ success: false });
    }

    const newComment = await BlogComment.create({
      blog: blogId,
      user: userId,
      comment,
    });
    await newComment.populate("user", "name");
    res.json({ success: true, comment: newComment });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};
