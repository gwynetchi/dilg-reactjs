import { Request, Response, NextFunction, Router } from 'express';
import { auth, db } from "../firebaseAdmin";

const router = Router();

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

const updateCredentialsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { uid, email, password } = req.body as UpdateCredentialsRequest;

  const sendResponse = (statusCode: number, responseBody: ResponseBody) => {
    res.status(statusCode).json(responseBody);
  };

  const authHeader: string | undefined = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendResponse(401, {
      success: false,
      error: "Unauthorized - No token provided",
    });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await auth.verifyIdToken(token);
    const requestingUid = decodedToken.uid;

    if (requestingUid !== uid) {
      return sendResponse(403, {
        success: false,
        error: "Forbidden - You can only update your own credentials",
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendResponse(400, {
        success: false,
        error: "Invalid email format",
      });
    }

    if (password && password.length < 6) {
      return sendResponse(400, {
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    const updateData: { email?: string; password?: string } = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;

    // 🔐 Update Firebase Auth credentials
    await auth.updateUser(uid, updateData);

    // ⚠️ Store raw email & password in Firestore (NOT secure — dev only)
    const userDocRef = db.collection("users").doc(uid);
    await userDocRef.update({
      ...(email && { email }),
      ...(password && { password }), // storing raw password
    });

    return sendResponse(200, {
      success: true,
      message: "Credentials updated successfully",
    });
  } catch (error: any) {
    console.error("Admin Update Error:", error);

    let errorMessage = "Failed to update credentials";
    if (error.code === 'auth/email-already-exists') {
      errorMessage = "Email already in use by another account";
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = "Password must be at least 6 characters";
    }

    return sendResponse(500, {
      success: false,
      error: errorMessage,
      code: error.code,
    });
  }
};

router.post("/update-credentials", updateCredentialsHandler);

export default router;
