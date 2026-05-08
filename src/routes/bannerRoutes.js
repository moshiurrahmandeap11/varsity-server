// bannerRoutes.js
import { Router } from "express";
import {
    createBanner,
    createMultipleBanners,
    deleteBanner,
    deleteMultipleBanners,
    getBanners,
    getSingleBanner,
    toggleBannerStatus,
    updateBanner,
} from "../controllers/bannerControllers.js";
import { uploadMultiple, uploadSingle } from "../middleware/upload.js";

const router = Router();

// Public routes
router.get("/", getBanners);
router.get("/:id", getSingleBanner);

// Protected routes (require authentication)
router.post(
  "/single",
  (req, res, next) => {
    const upload = uploadSingle("banners", "image");
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
  createBanner,
);

router.post(
  "/multiple",
  (req, res, next) => {
    const upload = uploadMultiple("banners", "images", 10);
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
  createMultipleBanners,
);

router.put(
  "/:id",

  (req, res, next) => {
    const upload = uploadSingle("banners", "image");
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
  updateBanner,
);

router.delete("/:id", deleteBanner);
router.post("/delete-multiple", deleteMultipleBanners);
router.patch("/:id/toggle-status", toggleBannerStatus);

export default router;
