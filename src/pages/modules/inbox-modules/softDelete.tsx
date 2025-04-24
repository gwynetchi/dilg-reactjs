// src/utils/softDelete.tsx
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";

/**
 * Soft delete a document by saving its data to an archive collection.
 */
export const softDelete = async (
  originalData: any,
  originalCollection: string,
  deletedCollection: string
) => {
  try {
    const deletedRef = doc(db, deletedCollection, originalData.id);
    await setDoc(deletedRef, {
      ...originalData,
      deletedAt: new Date(),
      originalCollection: originalCollection,
    });
  } catch (err) {
    console.error("Error archiving deleted document:", err);
  }
};
