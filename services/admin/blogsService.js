import Blog from '../../models/blogSchema.js';
import User from '../../models/userSchema.js';
import BlogLike from '../../models/blogLikeSchema.js';
import BlogComment from '../../models/blogCommentSchema.js';
import { HttpStatus } from '../../helpers/statusCodes.js';

export const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find()
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const blogIds = blogs.map((b) => b._id);

    const likeAgg = await BlogLike.aggregate([
      { $match: { blog: { $in: blogIds } } },
      { $group: { _id: '$blog', count: { $sum: 1 } } },
    ]);

    const commentAgg = await BlogComment.aggregate([
      { $match: { blog: { $in: blogIds } } },
      { $group: { _id: '$blog', count: { $sum: 1 } } },
    ]);

    const likeMap = {};
    likeAgg.forEach((l) => {
      likeMap[l._id.toString()] = l.count;
    });

    const commentMap = {};
    commentAgg.forEach((c) => {
      commentMap[c._id.toString()] = c.count;
    });

    blogs.forEach((blog) => {
      blog.likeCount = likeMap[blog._id.toString()] || 0;
      blog.commentCount = commentMap[blog._id.toString()] || 0;
    });
    const user = await User.find();

    res.render('blogs', {
      blogs,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Failed to load blogs');
  }
};

export const getBlogDetails = async (req, res) => {
  try {
    const blogId = req.params.id;
    const admin = req.session.admin; 

    const blog = await Blog.findById(blogId).populate('author', 'name').lean();

    if (!blog) {
      return res.status(HttpStatus.NOT_FOUND).render('404');
    }

    const likeCount = await BlogLike.countDocuments({
      blog: blogId,
    });

    const comments = await BlogComment.find({
      blog: blogId,
    })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.render('detailed-blog', {
      blog,
      comments,
      likeCount,
      admin,
    });
  } catch (error) {
    console.error('Admin blog detail error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Failed to load blog details');
  }
};

export const blockUnblockBlog = async (req, res) => {
  try {
    const blogId = req.params.id;

    const blog = await Blog.findById(blogId);

    if (!blog) {
      return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Blog not found' });
    }

    blog.isBlocked = !blog.isBlocked;
    await blog.save();

    res.json({
      success: true,
      isBlocked: blog.isBlocked,
    });
  } catch (error) {
    console.error('Block blog error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

export const deleteCommentAdmin = async (req, res) => {
  try {
    const commentId = req.params.id;

    const deleted = await BlogComment.findByIdAndDelete(commentId);

    if (!deleted) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Comment not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Admin delete comment error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};

export const adminBlogSearch = async (req, res) => {
  try {
    if (!req.session.admin) return res.status(401).send('');

    const query = req.query.q?.trim();
    let blogs = [];

    if (query) {
      blogs = await Blog.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author',
          },
        },
        { $unwind: '$author' },
        {
          $match: {
            $or: [
              { title: { $regex: query, $options: 'i' } },
              { content: { $regex: query, $options: 'i' } },
              { 'author.name': { $regex: query, $options: 'i' } },
            ],
          },
        },
        { $sort: { createdAt: -1 } },
      ]);
    } else {
      blogs = await Blog.find()
        .populate('author', 'name')
        .sort({ createdAt: -1 })
        .lean();
    }

    return res.render('blogListAdmin', { blogs });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('');
  }
};
