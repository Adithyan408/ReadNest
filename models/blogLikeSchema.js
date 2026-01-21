import mongoose from 'mongoose';

const blogLikeSchema = new mongoose.Schema({
  blog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },    
}, 
 { timestamps: true },
);

blogLikeSchema.index({ blog: 1, user: 1 }, { unique: true });
const BlogLike = mongoose.model('BlogLike', blogLikeSchema);
export default BlogLike;
