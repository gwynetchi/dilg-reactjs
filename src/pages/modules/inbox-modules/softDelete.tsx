import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";

/**
 * Soft delete a document by saving its data to an archive collection.
 * @param originalData - The original document data (must include `id`).
 * @param originalCollection - The name of the original collection.
 * @param deletedCollection - The name of the archive/deleted collection.
 * @param deletedBy - The UID or name of the user who deleted the document.
 */
export const softDelete = async (
  originalData: any,
  originalCollection: string,
  deletedCollection: string,
  deletedBy: string
) => {
  try {
    // Fetch the user who deleted the document
    const userDocRef = doc(db, "users", deletedBy);
    const userSnapshot = await getDoc(userDocRef);
    let deletedByName = deletedBy; // Fallback to UID if no name found

    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      deletedByName = `${userData.fname || ""} ${userData.mname || ""} ${userData.lname || ""}`.trim() || userData.email || deletedBy;
    }

    const deletedRef = doc(db, deletedCollection, originalData.id);
    await setDoc(deletedRef, {
      ...originalData,
      deletedAt: new Date(),
      deletedBy: deletedByName, // Store the full name or email of the user who deleted
      originalCollection,
    });
  } catch (err) {
    console.error("Error archiving deleted document:", err);
  }
};

export default softDelete;
