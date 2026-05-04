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
    updateBanner
} from "../controllers/bannerControllers.js";
import { uploadMultiple, uploadSingle } from "../middleware/upload.js";
import verifyToken from "../middleware/verifyToken.js";

const router = Router();

// Public routes
router.get("/", getBanners);
router.get("/:id", getSingleBanner);

// Protected routes (require authentication)
router.post(
    "/single", 
    verifyToken, 
    (req, res, next) => {
        const upload = uploadSingle('banners', 'image');
        upload(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    }, 
    createBanner
);

router.post(
    "/multiple", 
    verifyToken, 
    (req, res, next) => {
        const upload = uploadMultiple('banners', 'images', 10);
        upload(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    }, 
    createMultipleBanners
);

router.put(
    "/:id", 
    verifyToken, 
    (req, res, next) => {
        const upload = uploadSingle('banners', 'image');
        upload(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    }, 
    updateBanner
);

router.delete("/:id", verifyToken, deleteBanner);
router.post("/delete-multiple", verifyToken, deleteMultipleBanners);
router.patch("/:id/toggle-status", verifyToken, toggleBannerStatus);

export default router;