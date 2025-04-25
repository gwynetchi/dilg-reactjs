import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
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
    const userDocRef = doc(db, "users", deletedBy);
    const userSnapshot = await getDoc(userDocRef);
    let deletedByName = deletedBy;

    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      deletedByName =
        `${userData.fname || ""} ${userData.mname || ""} ${userData.lname || ""}`.trim() ||
        userData.email ||
        deletedBy;
    }

    const deletedRef = doc(db, deletedCollection, originalData.id);
    await setDoc(deletedRef, {
      ...originalData,
      deletedAt: new Date(),
      deletedBy: deletedByName,
      originalCollection,
    });
  } catch (err) {
    console.error("Error archiving deleted document:", err);
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

export default softDelete;
