import { ObjectId } from "mongodb";
import { db } from "../../database/db.js";
import { deleteFromCloudinary } from "../../middleware/upload.js";

// Get all notices
export const allNotices = async (req, res) => {
  try {
    const { category, isActive, priority } = req.query;
    
    let query = {};
    
    // Filter by category if provided
    if (category) {
      query.category = category;
    }
    
    // Filter by priority if provided
    if (priority) {
      query.priority = priority;
    }
    
    // Filter by active status if provided
    if (isActive === "true") {
      query.isActive = true;
    }
    
    const result = await db
      .collection("notices")
      .find(query)
      .sort({ createdAt: -1, priority: -1 }) // urgent priority first
      .toArray();
      
    res.status(200).json({
      success: true,
      message: "Notices retrieved successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: [],
    });
  }
};

// Get single notice by ID
export const getSingleNotice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID",
      });
    }

    const notice = await db.collection("notices").findOne({
      _id: new ObjectId(id),
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    // Increment view count
    await db.collection("notices").updateOne(
      { _id: new ObjectId(id) },
      { $inc: { views: 1 } }
    );

    res.status(200).json({
      success: true,
      message: "Notice retrieved successfully",
      data: notice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create notice (supports file upload)
export const createNotice = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      category, 
      priority, 
      isActive,
      publishDate,
      expiryDate,
      author
    } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // Prepare file data if file uploaded
    let fileData = null;
    if (req.file) {
      let fileType = 'other';
      let resourceType = 'raw';
      
      if (req.file.mimetype.startsWith('image/')) {
        fileType = 'image';
        resourceType = 'image';
      } else if (req.file.mimetype === 'application/pdf') {
        fileType = 'pdf';
        resourceType = 'raw';
      } else if (req.file.mimetype === 'application/msword' || 
                 req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        fileType = 'document';
        resourceType = 'raw';
      } else if (req.file.mimetype === 'application/vnd.ms-excel' ||
                 req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        fileType = 'spreadsheet';
        resourceType = 'raw';
      }
      
      fileData = {
        url: req.file.path,
        publicId: req.file.filename,
        format: req.file.format || req.file.mimetype.split('/')[1],
        size: req.file.size,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        fileType: fileType,
        resourceType: resourceType
      };
    }

    const noticeData = {
      title,
      description: description || "",
      category: category || "general",
      priority: priority || "normal", // normal, high, urgent
      isActive: isActive === "true" || isActive === true,
      publishDate: publishDate ? new Date(publishDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      author: author || "Admin",
      file: fileData,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("notices").insertOne(noticeData);

    res.status(201).json({
      success: true,
      message: "Notice created successfully",
      data: {
        id: result.insertedId,
        ...noticeData,
      },
    });
  } catch (error) {
    console.error("Error creating notice:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error creating notice",
    });
  }
};

// Create multiple notices with files
export const createMultipleNotices = async (req, res) => {
  try {
    const { titles, descriptions, categories, priorities, isActive, authors } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one file is required",
      });
    }

    if (!titles || (Array.isArray(titles) && titles.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Titles are required for each notice",
      });
    }

    const notices = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const title = Array.isArray(titles) ? titles[i] : titles;
      const description = Array.isArray(descriptions) ? descriptions?.[i] : descriptions;
      const category = Array.isArray(categories) ? categories?.[i] : categories;
      const priority = Array.isArray(priorities) ? priorities?.[i] : priorities;
      const author = Array.isArray(authors) ? authors?.[i] : authors;

      if (!title) {
        return res.status(400).json({
          success: false,
          message: `Title is required for notice ${i + 1}`,
        });
      }

      // Prepare file data
      let fileType = 'other';
      let resourceType = 'raw';
      
      if (file.mimetype.startsWith('image/')) {
        fileType = 'image';
        resourceType = 'image';
      } else if (file.mimetype === 'application/pdf') {
        fileType = 'pdf';
        resourceType = 'raw';
      } else if (file.mimetype === 'application/msword' || 
                 file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        fileType = 'document';
        resourceType = 'raw';
      } else if (file.mimetype === 'application/vnd.ms-excel' ||
                 file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        fileType = 'spreadsheet';
        resourceType = 'raw';
      }
      
      const fileData = {
        url: file.path,
        publicId: file.filename,
        format: file.format || file.mimetype.split('/')[1],
        size: file.size,
        originalName: file.originalname,
        mimetype: file.mimetype,
        fileType: fileType,
        resourceType: resourceType
      };

      notices.push({
        title,
        description: description || "",
        category: category || "general",
        priority: priority || "normal",
        isActive: isActive === "true" || isActive === true,
        publishDate: new Date(),
        expiryDate: null,
        author: author || "Admin",
        file: fileData,
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const result = await db.collection("notices").insertMany(notices);

    res.status(201).json({
      success: true,
      message: `${notices.length} notices created successfully`,
      data: notices.map((notice, index) => ({
        id: result.insertedIds[index],
        ...notice,
      })),
    });
  } catch (error) {
    console.error("Error creating multiple notices:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error creating notices",
    });
  }
};

// Update notice
export const updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      category, 
      priority, 
      isActive,
      publishDate,
      expiryDate,
      author
    } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID",
      });
    }

    const updateData = {
      title,
      description,
      category,
      priority,
      isActive: isActive === "true" || isActive === true,
      author,
      updatedAt: new Date(),
    };

    // Only add dates if they exist
    if (publishDate) {
      updateData.publishDate = new Date(publishDate);
    }
    if (expiryDate) {
      updateData.expiryDate = new Date(expiryDate);
    }

    // Handle file update
    if (req.file) {
      // Get old notice to delete old file
      const oldNotice = await db.collection("notices").findOne({
        _id: new ObjectId(id),
      });

      // Delete old file from Cloudinary if exists
      if (oldNotice?.file?.publicId) {
        const resourceType = oldNotice.file.resourceType || 
          (oldNotice.file.fileType === 'image' ? 'image' : 'raw');
        await deleteFromCloudinary(oldNotice.file.publicId, resourceType);
      }

      // Prepare new file data
      let fileType = 'other';
      let resourceType = 'raw';
      
      if (req.file.mimetype.startsWith('image/')) {
        fileType = 'image';
        resourceType = 'image';
      } else if (req.file.mimetype === 'application/pdf') {
        fileType = 'pdf';
        resourceType = 'raw';
      } else if (req.file.mimetype === 'application/msword' || 
                 req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        fileType = 'document';
        resourceType = 'raw';
      } else if (req.file.mimetype === 'application/vnd.ms-excel' ||
                 req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        fileType = 'spreadsheet';
        resourceType = 'raw';
      }
      
      updateData.file = {
        url: req.file.path,
        publicId: req.file.filename,
        format: req.file.format || req.file.mimetype.split('/')[1],
        size: req.file.size,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        fileType: fileType,
        resourceType: resourceType
      };
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const result = await db
      .collection("notices")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notice updated successfully",
    });
  } catch (error) {
    console.error("Error updating notice:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error updating notice",
    });
  }
};

// Delete notice
export const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID",
      });
    }

    const notice = await db.collection("notices").findOne({
      _id: new ObjectId(id),
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    // Delete file from Cloudinary if exists
    if (notice.file?.publicId) {
      const resourceType = notice.file.resourceType || 
        (notice.file.fileType === 'image' ? 'image' : 'raw');
      await deleteFromCloudinary(notice.file.publicId, resourceType);
    }

    const result = await db.collection("notices").deleteOne({
      _id: new ObjectId(id),
    });

    res.status(200).json({
      success: true,
      message: "Notice deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notice:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting notice",
    });
  }
};

// Delete multiple notices
export const deleteMultipleNotices = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Notice IDs are required",
      });
    }

    const validIds = ids.filter((id) => ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid notice IDs provided",
      });
    }

    // Get all notices to delete their files
    const notices = await db
      .collection("notices")
      .find({
        _id: { $in: validIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    // Delete files from Cloudinary
    for (const notice of notices) {
      if (notice.file?.publicId) {
        const resourceType = notice.file.resourceType || 
          (notice.file.fileType === 'image' ? 'image' : 'raw');
        await deleteFromCloudinary(notice.file.publicId, resourceType);
      }
    }

    // Delete from database
    const result = await db.collection("notices").deleteMany({
      _id: { $in: validIds.map((id) => new ObjectId(id)) },
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} notices deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting multiple notices:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting notices",
    });
  }
};

// Toggle notice status (Active/Inactive)
export const toggleNoticeStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID",
      });
    }

    const notice = await db.collection("notices").findOne({
      _id: new ObjectId(id),
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    const result = await db
      .collection("notices")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { isActive: !notice.isActive, updatedAt: new Date() } }
      );

    res.status(200).json({
      success: true,
      message: `Notice ${!notice.isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error toggling notice status",
    });
  }
};