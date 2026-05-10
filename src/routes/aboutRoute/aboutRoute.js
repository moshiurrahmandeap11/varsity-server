import { Router } from "express";
import {
  getAbout,
  createAbout,
  updateAbout,
  deleteAboutImage,
} from "../../controllers/aboutController/aboutController.js";
import { uploadSingle } from "../../middleware/upload.js";

const router = Router();

// Public route - Get About
router.get("/", getAbout);

// Protected routes (add verifyToken middleware if needed)
router.post(
  "/",
  (req, res, next) => {
    const upload = uploadSingle("about", "image");
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  },
  createAbout
);

router.put(
  "/",
  (req, res, next) => {
    const upload = uploadSingle("about", "image");
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  },
  updateAbout
);

// Delete only the image
router.delete("/image", deleteAboutImage);

export default router;