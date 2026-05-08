import { Router } from "express";
import {
    allNotices,
    createMultipleNotices,
    createNotice,
    deleteMultipleNotices,
    deleteNotice,
    getSingleNotice,
    toggleNoticeStatus,
    updateNotice
} from "../../controllers/noticeControllers/noticeControllers.js";
import { uploadMultiple, uploadSingle } from "../../middleware/upload.js";

const router = Router();

// Public routes
router.get("/", allNotices);
router.get("/:id", getSingleNotice);

// Protected routes (require authentication - add verifyToken if needed)
router.post(
  "/single",
  (req, res, next) => {
    const upload = uploadSingle("notices", "file");
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
  createNotice,
);

router.post(
  "/multiple",
  (req, res, next) => {
    const upload = uploadMultiple("notices", "files", 10);
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
  createMultipleNotices,
);

router.put(
  "/:id",
  (req, res, next) => {
    const upload = uploadSingle("notices", "file");
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
  updateNotice,
);

router.delete("/:id", deleteNotice);
router.post("/delete-multiple", deleteMultipleNotices);
router.patch("/:id/toggle-status", toggleNoticeStatus);

export default router;