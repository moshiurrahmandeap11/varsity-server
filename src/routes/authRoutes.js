import { Router } from "express";
import {
  changePassword,
  deleteAccount,
  emailLogin,
  emailSignup,
  getCurrentUser,
  updateProfile
} from "../controllers/authControllers.js";
import { uploadSingle } from "../middleware/upload.js";
import verifyToken from "../middleware/verifyToken.js";

const router = Router();

// Public routes
router.post("/signup", emailSignup);
router.post("/login", emailLogin);

// Protected routes
router.get("/me", verifyToken, getCurrentUser);
router.put(
  "/profile",
  verifyToken,
  (req, res, next) => {
    const upload = uploadSingle("profiles", "profileImage");
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
  updateProfile
);
router.delete("/account", verifyToken, deleteAccount);
router.put("/change-password", verifyToken, changePassword);

export default router;