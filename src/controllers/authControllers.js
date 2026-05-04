
import bcrypt from "bcryptjs";
import admin from "firebase-admin";
import jwt from "jsonwebtoken";
import { db } from "../database/db.js";

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Helper function to generate JWT
const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role || "user",
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "3d" });
};


// Email Signup
export const emailSignup = async (req, res) => {
  try {
    const { email,  name,photo, uid, phone, emailVerified } = req.body;

    if (!email ) {
      return res.status(400).json({
        success: false,
        message: "Email  are required",
      });
    }

    const usersCollection = db.collection("users");

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create user in MongoDB
    const newUser = {
      email,
      name: name || "",
      photoURL: photo || "",
      firebaseUid: uid || null,
      phone: phone || null,
      emailVerified: emailVerified || false,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);
    const user = { ...newUser, _id: result.insertedId };

    // Generate JWT token
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        token,
        user: {
          id: user._id,
          uid: user.firebaseUid,
          email: user.email,
          name: user.name,
          photoURL: user.photoURL,
          role: user.role,
          phone: user.phone,
          emailVerified: user.emailVerified,
        },
      },
    });
  } catch (error) {
    console.error("Email signup error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Signup failed",
    });
  }
};

// Email Login
export const emailLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }


    const usersCollection = db.collection("users");

    // Find user by email
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if user has password (Google users might not have password)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "Please login using Google",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          photoURL: user.photoURL,
          role: user.role,
          phone: user.phone,
          emailVerified: user.emailVerified,
        },
      },
    });
  } catch (error) {
    console.error("Email login error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

// Get Current User
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;


    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        photoURL: user.photoURL,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get user",
    });
  }
};

// Update User Profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, photoURL } = req.body;


    const usersCollection = db.collection("users");

    const updateData = {
      updatedAt: new Date(),
    };

    if (name) updateData.name = name;
    if (photoURL) updateData.photoURL = photoURL;

    // If there's an uploaded file
    if (req.file) {
      let resourceType = "image";
      if (req.file.mimetype.startsWith("image/")) {
        resourceType = "image";
      } else if (req.file.mimetype.startsWith("video/")) {
        resourceType = "video";
      }

      updateData.photoURL = req.file.path;
      updateData.photoPublicId = req.file.filename;
      updateData.photoResourceType = resourceType;
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get updated user
    const updatedUser = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        photoURL: updatedUser.photoURL,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};

// Delete User Account (with Firebase cleanup)
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;


    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete from Firebase Auth if firebaseUid exists
    if (user.firebaseUid) {
      try {
        await admin.auth().deleteUser(user.firebaseUid);
      } catch (firebaseError) {
        console.error("Firebase delete error:", firebaseError);
        // Continue with MongoDB deletion even if Firebase deletion fails
      }
    }

    // Delete from MongoDB
    await usersCollection.deleteOne({ _id: new ObjectId(userId) });

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete account",
    });
  }
};

// Change Password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }


    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has password
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "This account uses Google login. No password to change.",
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to change password",
    });
  }
};