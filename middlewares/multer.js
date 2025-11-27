import cloudinary from "cloudinary";
import multer from "multer";
import path from "path";
import pkg from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CloudinaryStorage = pkg.default || pkg.CloudinaryStorage;


const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: "re-image",
    allowedFormats: ["jpg", "jpeg", "png", "webp"],
    public_id: (req, file) =>
      `${Date.now()}-${path.parse(file.originalname).name}`,
  },
});


const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const mime = allowed.test(file.mimetype);
  const ext = allowed.test(
    path.extname(file.originalname).toLowerCase()
  );

  if (mime && ext) cb(null, true);
  else cb(new Error("Only image files allowed"));
};


const upload = multer({ storage, fileFilter });

export default upload;
