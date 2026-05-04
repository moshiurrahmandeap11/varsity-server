import { db } from "../database/db.js";
import { deleteFromCloudinary } from "../middleware/upload.js";

// Single Banner Create
export const createBanner = async (req, res) => {
  try {
    const { title, description, link, isActive } = req.body;

    if (!title || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Title and banner image are required",
      });
    }

    const bannerData = {
      title,
      description: description || "",
      link: link || "",
      isActive: isActive === "true" || isActive === true,
      image: {
        url: req.file.path,
        publicId: req.file.filename,
        format: req.file.format,
        size: req.file.size,
        originalName: req.file.originalname,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("banners").insertOne(bannerData);

    res.status(201).json({
      success: true,
      message: "Banner created successfully",
      data: {
        id: result.insertedId,
        ...bannerData,
      },
    });
  } catch (error) {
    console.error("Error creating banner:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error creating banner",
    });
  }
};

// Multiple Banners Create (Array of files)
export const createMultipleBanners = async (req, res) => {
  try {
    const { titles, descriptions, links, isActive } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one banner image is required",
      });
    }

    const banners = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const title = Array.isArray(titles) ? titles[i] : titles;
      const description = Array.isArray(descriptions)
        ? descriptions?.[i]
        : descriptions;
      const link = Array.isArray(links) ? links?.[i] : links;

      if (!title) {
        return res.status(400).json({
          success: false,
          message: `Title is required for banner ${i + 1}`,
        });
      }

      banners.push({
        title,
        description: description || "",
        link: link || "",
        isActive: isActive === "true" || isActive === true,
        image: {
          url: file.path,
          publicId: file.filename,
          format: file.format,
          size: file.size,
          originalName: file.originalname,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const result = await db.collection("banners").insertMany(banners);

    res.status(201).json({
      success: true,
      message: `${banners.length} banners created successfully`,
      data: banners.map((banner, index) => ({
        id: result.insertedIds[index],
        ...banner,
      })),
    });
  } catch (error) {
    console.error("Error creating multiple banners:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error creating banners",
    });
  }
};

// Get Single Banner by ID
export const getSingleBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const banner = await db.collection("banners").findOne({
      _id: new ObjectId(id),
    });

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Banner retrieved successfully",
      data: banner,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving banner",
    });
  }
};

// Update Banner
export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, link, isActive } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const updateData = {
      title,
      description,
      link,
      isActive: isActive === "true" || isActive === true,
      updatedAt: new Date(),
    };

    if (req.file) {
      const oldBanner = await db.collection("banners").findOne({
        _id: new ObjectId(id),
      });

      if (oldBanner?.image?.publicId) {
        await deleteFromCloudinary(oldBanner.image.publicId, "image");
      }

      updateData.image = {
        url: req.file.path,
        publicId: req.file.filename,
        format: req.file.format,
        size: req.file.size,
        originalName: req.file.originalname,
      };
    }

    const result = await db
      .collection("banners")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Banner updated successfully",
    });
  } catch (error) {
    console.error("Error updating banner:", error);
    res.status(500).json({
      success: false,
      message: "Error updating banner",
    });
  }
};

// Delete Banner
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const banner = await db.collection("banners").findOne({
      _id: new ObjectId(id),
    });

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    if (banner.image?.publicId) {
      await deleteFromCloudinary(banner.image.publicId, "image");
    }

    const result = await db.collection("banners").deleteOne({
      _id: new ObjectId(id),
    });

    res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting banner:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting banner",
    });
  }
};

// Bulk Delete Banners
export const deleteMultipleBanners = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Banner IDs are required",
      });
    }

    const validIds = ids.filter((id) => ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid banner IDs provided",
      });
    }

    const banners = await db
      .collection("banners")
      .find({
        _id: { $in: validIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    for (const banner of banners) {
      if (banner.image?.publicId) {
        await deleteFromCloudinary(banner.image.publicId, "image");
      }
    }

    const result = await db.collection("banners").deleteMany({
      _id: { $in: validIds.map((id) => new ObjectId(id)) },
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} banners deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting multiple banners:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting banners",
    });
  }
};

// Toggle Banner Status (Active/Inactive)
export const toggleBannerStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner ID",
      });
    }

    const banner = await db.collection("banners").findOne({
      _id: new ObjectId(id),
    });

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    const result = await db
      .collection("banners")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { isActive: !banner.isActive, updatedAt: new Date() } },
      );

    res.status(200).json({
      success: true,
      message: `Banner ${!banner.isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error toggling banner status",
    });
  }
};

export const getBanners = async (req, res) => {
  try {
    const { activeOnly } = req.query;

    let query = {};
    if (activeOnly === "true") {
      query.isActive = true;
    }

    const result = await db
      .collection("banners")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Banners retrieved successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving banners",
      data: [],
    });
  }
};
