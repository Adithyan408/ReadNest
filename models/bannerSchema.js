import mongoose from "mongoose";
const { Schema } = mongoose;

const bannerSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    bannerImage: {
      type: String,
      required: true,
    },
    startDate: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    }
  },
  { timestamps: true }
);

const Banner = mongoose.model("Banner", bannerSchema);

export default Banner;
