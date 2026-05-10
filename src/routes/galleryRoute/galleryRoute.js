import { Router } from "express";
import {
  getGallery,
  getSingleGallery,
  createGallery,
  updateGallery,
  deleteGallery,
  deleteMultipleGallery,
} from "../../controllers/galleryController/galleryController.js";
import { uploadSingle } from "../../middleware/upload.js";

const router = Router();

// Public routes
router.get("/", getGallery);
router.get("/:id", getSingleGallery);

// Protected routes (add verifyToken middleware if needed)
router.post(
  "/",
  (req, res, next) => {
    const upload = uploadSingle("gallery", "file");
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
  createGallery
);

router.put(
  "/:id",
  (req, res, next) => {
    const upload = uploadSingle("gallery", "file");
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
  updateGallery
);

// Delete routes
router.delete("/:id", deleteGallery);
router.post("/delete-multiple", deleteMultipleGallery);

export default router;