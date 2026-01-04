import Blog from "../../models/blogSchema.js";
import sanitizeHtml from "sanitize-html";
import BlogLike from "../../models/blogLikeSchema.js";
import BlogComment from "../../models/blogCommentSchema.js";
import User from "../../models/userSchema.js";
import Notification from "../../models/blogNotification.js";

export const listBlog = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    const blogs = await Blog.find({ isBlocked: false })
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

    if (userId) {
      const user = await User.findById(userId).select("savedBlogs");

      const savedSet = new Set(user.savedBlogs.map((id) => id.toString()));

      blogs.forEach((blog) => {
        blog.isSaved = savedSet.has(blog._id.toString());
      });
    }
    const user = await User.findById(userId);

    res.render("blog", {
      blogs,
      user,
      baseUrl: `${req.protocol}://${req.get("host")}`,
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

    const user = await User.findById(userId);
    const blogUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    res.render("blog-details", {
      blog,
      likeCount,
      userLiked,
      comments,
      user,
      blogUrl
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

    const blog = await Blog.findById(blogId);

    if (blog.author.toString() !== userId.toString()) {
      await Notification.create({
        recipient: blog.author,
        sender: userId,
        blog: blogId,
        type: "like",
      });
    }

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

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false });
    }

    const newComment = await BlogComment.create({
      blog: blogId,
      user: userId,
      comment,
    });

    await newComment.populate("user", "name");

    const blog = await Blog.findById(blogId);

    if (blog && blog.author.toString() !== userId.toString()) {
      await Notification.create({
        recipient: blog.author,
        sender: userId,
        blog: blogId,
        type: "comment",
      });
    }

    res.json({ success: true, comment: newComment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

export const toggelSaveBlog = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { blogId } = req.body;

    const user = await User.findById(userId);

    const alreadySaved = user.savedBlogs.includes(blogId);
    if (alreadySaved) {
      user.savedBlogs.pull(blogId);
    } else {
      user.savedBlogs.push(blogId);
    }
    await user.save();
    res.json({ success: true, saved: !alreadySaved });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

export const getSavedBlog = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const user = await User.findById(userId)
      .populate({
        path: "savedBlogs",
        populate: { path: "author", select: "name" },
      })
      .lean();

    const blogs = user.savedBlogs
      .map((blog) => ({
        ...blog,
        isSaved: true,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const users = await User.findById(userId);
    res.render("savedBlogs", {
      users,
      blogs,
      user: req.session.user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

export const getStories = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.redirect("/login");
    }

    const blogs = await Blog.find({ author: userId })
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

    if (userId) {
      const user = await User.findById(userId).select("savedBlogs");

      const savedSet = new Set(user.savedBlogs.map((id) => id.toString()));

      blogs.forEach((blog) => {
        blog.isSaved = savedSet.has(blog._id.toString());
      });
    }
    const user = await User.findById(userId);

    res.render("myStories", {
      blogs,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

export const blogDelete = async (req, res) => {
  try {
    const blogId = req.params.id;
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.json({ success: false });
    }
    if (blog.author.toString() !== req.session.user._id.toString()) {
      return res.status(403).json({ success: false });
    }
    await Blog.findByIdAndDelete(blogId);
    await BlogComment.deleteMany({ blog: blog._id });

    return res.json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

export const editBlogGet = async (req, res) => {
  try {
    const blogId = req.params.id;
    const blog = await Blog.findById(blogId);
    if (blog.author.toString() !== req.session.user.id.toString()) {
      return res.status(403).json({ success: false });
    }
    res.render("edit-blog", { blog });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

export const editBlogPost = async (req, res) => {
  try {
    const { title, content } = req.body;
    const blogId = req.params.id;

    await Blog.findOneAndUpdate(blogId, {
      title,
      content,
    });
  } catch (error) {
    res.redirect("/notfound");
  }
};

export const commentDelete = async (req, res) => {
  try {
    const comment = await BlogComment.findById(req.params.id);
    if (!comment) {
      return res.json({ success: false });
    }

    await BlogComment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    return res.json({ success: false });
  }
};

export const putEditBlog = async (req, res) => {
  try {
    const { title, content } = req.body;

    await Blog.findByIdAndUpdate(req.params.id, {
      title,
      content,
    });

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: "Update failed" });
  }
};

export const putEditComment = async (req, res) => {
  try {
    const { comment } = req.body;
    const userId = req.session.user._id;

    const updated = await BlogComment.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { comment },
      { new: true }
    );

    if (!updated) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: "Update failed" });
  }
};

export const searchBlogs = async (req, res) => {
  try {
    const query = req.query.q?.trim();

    let blogs = [];

    if (query) {
      blogs = await Blog.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author",
          },
        },
        { $unwind: "$author" },

        {
          $match: {
            isBlocked: false,
            $or: [
              { title: { $regex: query, $options: "i" } },
              { content: { $regex: query, $options: "i" } },
              { "author.name": { $regex: query, $options: "i" } },
            ],
          },
        },

        { $sort: { createdAt: -1 } },
      ]);
    } else {
      blogs = await Blog.find({ isBlocked: false })
        .populate("author", "name")
        .sort({ createdAt: -1 })
        .lean();
    }

    res.render("blogList", { blogs });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).send("");
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    res.json({ count });
  } catch {
    res.json({ count: 0 });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const notifications = await Notification.find({
      recipient: userId,
      isRead: false, 
    })
      .populate("sender", "name")
      .populate("blog", "title")
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(notifications);
  } catch {
    res.json([]);
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.session.user._id;

    await Notification.updateMany({ recipient: userId }, { isRead: true });

    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
};

export const getInsights = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const postsCount = await Blog.countDocuments({
      author: userId,
      createdAt: { $gte: fromDate },
    });

    const userBlogs = await Blog.find(
      { author: userId },
      { _id: 1 }
    ).lean();

    const blogIds = userBlogs.map((b) => b._id);

    const likesReceived = await BlogLike.countDocuments({
      blog: { $in: blogIds },
      createdAt: { $gte: fromDate },
    });

    const commentsReceived = await BlogComment.countDocuments({
      blog: { $in: blogIds },
      createdAt: { $gte: fromDate },
    });

    const likesMade = await BlogLike.countDocuments({
      user: userId,
      createdAt: { $gte: fromDate },
    });

    const commentsMade = await BlogComment.countDocuments({
      user: userId,
      createdAt: { $gte: fromDate },
    });

    const interactions = likesMade + commentsMade;
    const users = await User.findById(userId)
    res.render("blogInsights", {
      likes: likesReceived, 
      comments: commentsReceived, 
      posts: postsCount, 
      interactions, 
      users
    })
  } catch (error) {
    console.error("Insights error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load insights",
    });
  }
};