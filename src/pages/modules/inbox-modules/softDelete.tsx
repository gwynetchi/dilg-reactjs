import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import { getAuth } from "firebase/auth";

/**
 * Soft delete a document by saving its data to an archive collection.
 * @param originalData - The original document data (must include `id`).
 * @param originalCollection - The name of the original collection.
 * @param deletedCollection - The name of the archive/deleted collection.
 * @param deletedByField - The field name to store who deleted the document.
 */
export const softDelete = async (
  originalData: any,
  originalCollection: string,
  deletedCollection: string,
) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get user details
    let deletedByInfo = {
      id: user.uid,
      name: "Unknown User",
      email: user.email || "No email"
    };

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userDocRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        deletedByInfo.name = 
          `${userData.fname || ""} ${userData.mname || ""} ${userData.lname || ""}`.trim() ||
          userData.email ||
          "Unknown User";
      }
    } catch (userErr) {
      console.warn("Could not fetch user details, using minimal info:", userErr);
    }

    // Prepare the deleted document
// In your softDelete.tsx
const deletedDoc = {
  ...originalData,
  deletedBy: { // Store as object with id for consistent permission checking
    id: user.uid,
    name: deletedByInfo.name,
    email: deletedByInfo.email
  },
  deletedAt: serverTimestamp(),
  originalCollection,
  // Preserve important fields
  createdAt: originalData.createdAt,
  id: originalData.id
};
    // Save to deleted collection
    const deletedRef = doc(db, deletedCollection, originalData.id);
    await setDoc(deletedRef, deletedDoc);

    console.log("Successfully soft-deleted document:", originalData.id);
    return true;
  } catch (err) {
    console.error("Error in softDelete:", err);
    throw err; // Re-throw to handle in calling function
  }
};

/**
 * Check if a user email exists in the deleted_users collection.
 * @param email - The email to check.
 * @returns True if the email exists in deleted_users, otherwise false.
 */
export const checkIfDeletedUser = async (email: string): Promise<boolean> => {
  const q = query(collection(db, "deleted_users"), where("email", "==", email.toLowerCase()));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

/**
 * Check if a communication ID exists in the deleted_communications collection.
 * @param id - The document ID to check.
 * @returns True if the communication is in deleted_communications, otherwise false.
 */
export const checkIfDeletedCommunication = async (id: string): Promise<boolean> => {
  const docRef = doc(db, "deleted_communications", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
};

// Export all functions
export default {
  softDelete,
  checkIfDeletedUser,
  checkIfDeletedCommunication
};