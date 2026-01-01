import mongoose from "mongoose";

const blogCommentSchema = new mongoose.Schema(
  {
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxLength: 500,
    },
  },
  { Timestamp: true }
);

const BlogComment = mongoose.model("BlogComment", blogCommentSchema);
export default BlogComment;