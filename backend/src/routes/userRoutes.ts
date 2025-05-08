import { Request, Response, NextFunction, Router } from 'express';
import { auth, db } from "../firebaseAdmin";
import * as admin from "firebase-admin";
import { UserRecord } from "firebase-admin/auth";

// 1. Type Augmentation for Express Request
declare module 'express' {
  interface Request {
    adminUser?: {
      uid: string;
      role: string;
    };
  }
}

const router = Router();

interface DeleteUserRequest {
  uid: string;
  permanent: boolean; // true for permanent delete, false for soft delete
}

const deleteUserHandler = async (
  req: Request,
  res: Response<ResponseBody>
) => {
  const { uid, permanent } = req.body as DeleteUserRequest;

  try {
    // Validate inputs
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: "User ID is required"
      });
    }

    // Check if target user exists
    try {
      await auth.getUser(uid);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    if (permanent) {
      // Permanent deletion - remove from Auth and Firestore
      await auth.deleteUser(uid);
      await db.collection("users").doc(uid).delete();
      
      // Optional: Move to deleted_users collection for records
      // const userDoc = await db.collection("users").doc(uid).get();
      // if (userDoc.exists) {
      //   await db.collection("deleted_users").doc(uid).set({
      //     ...userDoc.data(),
      //     deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      //     deletedBy: req.adminUser?.uid
      //   });
      // }
      
      return res.status(200).json({
        success: true,
        message: "User permanently deleted from system"
      });
    } else {
      // Soft delete - disable account and move to deleted_users
      await auth.updateUser(uid, { disabled: true });
      
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        await db.collection("deleted_users").doc(uid).set({
          ...userDoc.data(),
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          deletedBy: req.adminUser?.uid
        });
        await db.collection("users").doc(uid).delete();
      }
      
      return res.status(200).json({
        success: true,
        message: "User account disabled and moved to deleted users"
      });
    }

  } catch (error: any) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete user"
    });
  }
};

interface UpdateCredentialsRequest {
  uid: string;
  email?: string;
  password?: string;
}

interface ResponseBody {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
}

// 2. Fixed verifyAdmin Middleware
const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized - No token provided"
      });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user document
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    
    if (!userDoc.exists || userDoc.data()?.role !== "Admin") {
      return res.status(403).json({
        success: false,
        error: "Forbidden - Admin privileges required"
      });
    }

    // Attach admin info to request
    req.adminUser = {
      uid: decodedToken.uid,
      role: userDoc.data()?.role || ""
    };
    
    next();
  } catch (error) {
    console.error("Admin verification error:", error);
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token"
    });
  }
};

const updateCredentialsHandler = async (
  req: Request,
  res: Response<ResponseBody>
) => {
  const { uid, email, password } = req.body as UpdateCredentialsRequest;
  const currentUserUid = req.adminUser?.uid;

  try {
    // Validate inputs
    if (!uid) {
      return res.status(400).json({
        success: false,
        error: "User ID is required"
      });
    }

    // Check if target user exists
    let targetUser: UserRecord;
    try {
      targetUser = await auth.getUser(uid);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Prepare update data for Firebase Auth
    const authUpdateData: { email?: string; password?: string } = {};
    if (email && email !== targetUser.email) authUpdateData.email = email;
    if (password) authUpdateData.password = password;

    // Prepare update data for Firestore
    const firestoreUpdateData: { [key: string]: any } = {};
    if (email && email !== targetUser.email) firestoreUpdateData.email = email;
    if (password) firestoreUpdateData.password = password; // Storing plain password as requested

    // Update Firebase Auth if there are changes
    if (Object.keys(authUpdateData).length > 0) {
      await auth.updateUser(uid, authUpdateData);
    }

    // Update Firestore if there are changes
    if (Object.keys(firestoreUpdateData).length > 0) {
      await db.collection("users").doc(uid).update(firestoreUpdateData);
    }

    return res.status(200).json({
      success: true,
      message: "Credentials updated successfully"
    });

  } catch (error: any) {
    console.error("Update credentials error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update credentials"
    });
  }
};
// Add this new middleware
const verifyUserOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized - No token provided"
      });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user document
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return res.status(403).json({
        success: false,
        error: "Forbidden - User not found"
      });
    }

    const userRole = userDoc.data()?.role;
    const isAdmin = userRole === "Admin";
    const isEditingSelf = decodedToken.uid === req.body.uid;

    // Allow if admin or user editing themselves
    if (isAdmin || isEditingSelf) {
      req.adminUser = {
        uid: decodedToken.uid,
        role: userRole || ""
      };
      return next();
    }

    return res.status(403).json({
      success: false,
      error: "Forbidden - You can only edit your own credentials"
    });

  } catch (error) {
    console.error("User verification error:", error);
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token"
    });
  }
};

// Apply middleware and route
router.post("/update-credentials", 
  (req: Request, res: Response, next: NextFunction) => {
    verifyUserOrAdmin(req, res, next).catch(next);
  }, 
  (req: Request, res: Response, next: NextFunction) => {
    updateCredentialsHandler(req, res).catch(next);
  }
);

router.post("/delete", 
  (req: Request, res: Response, next: NextFunction) => {
    verifyAdmin(req, res, next).catch(next);
  }, // Only admins can delete users
  (req: Request, res: Response, next: NextFunction) => {
    deleteUserHandler(req, res).catch(next);
  }
);

export default router;
