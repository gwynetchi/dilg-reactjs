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
    // Fetch the user who deleted the document (to get their full name or email)
    const userDocRef = doc(db, "users", deletedBy);
    const userSnapshot = await getDoc(userDocRef);
    let deletedByName = deletedBy; // Fallback to UID if no name found

    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      // Construct the deletedBy name (first, middle, last name or email if no names are available)
      deletedByName = `${userData.fname || ""} ${userData.mname || ""} ${userData.lname || ""}`.trim() || userData.email || deletedBy;
    }

    // Reference to the deleted document in the archive collection
    const deletedRef = doc(db, deletedCollection, originalData.id);
    // Save the document in the deleted collection along with who deleted it
    await setDoc(deletedRef, {
      ...originalData,
      deletedAt: new Date(),
      deletedBy: deletedByName, // Store the name or email of the user who deleted it
      originalCollection,
    });
  } catch (err) {
    console.error("Error archiving deleted document:", err);
  }
};

export default softDelete;
