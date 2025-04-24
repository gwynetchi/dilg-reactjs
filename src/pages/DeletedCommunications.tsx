import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const DeletedCommunications = () => {
  const [communications, setCommunications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDeleted = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "deleted_communications"));
      const items = snapshot.docs.map(doc => {
        const commData = doc.data();
        // Ensure deletedBy is populated correctly (as name or email)
        const deletedByName = commData.deletedBy || "N/A"; // Fallback to "N/A" if deletedBy is not found
        return { id: doc.id, ...commData, deletedBy: deletedByName };
      });
      setCommunications(items); // Update the state with the fetched data
    } catch (err) {
      console.error("Error fetching deleted communications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (comm: any) => {
    try {
      // Restore the communication by moving it back to the communications collection
      await setDoc(doc(db, "communications", comm.id), {
        ...comm,
        restoredAt: new Date(),
      });

      // Remove it from the deleted_communications collection
      await deleteDoc(doc(db, "deleted_communications", comm.id));

      // Refresh the list by removing the restored item
      setCommunications((prev) => prev.filter((c) => c.id !== comm.id));
    } catch (error) {
      console.error("Failed to restore communication:", error);
    }
  };

  useEffect(() => {
    fetchDeleted();
  }, []); // Fetch deleted communications on component mount

  return (
    <div className="dashboard-container">
      <h2>Deleted Communications</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Remarks</th>
              <th>Deadline</th>
              <th>Deleted At</th>
              <th>Deleted By</th> {/* Column for showing who deleted the communication */}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {communications.map((comm) => (
              <tr key={comm.id}>
                <td>{comm.subject}</td>
                <td>{comm.remarks}</td>
                <td>
                  {comm.deadline?.seconds &&
                    new Date(comm.deadline.seconds * 1000).toLocaleString()}
                </td>
                <td>
                  {comm.deletedAt?.seconds &&
                    new Date(comm.deletedAt.seconds * 1000).toLocaleString()}
                </td>
                <td>{comm.deletedBy || "N/A"}</td> {/* Display deletedBy field */}
                <td>
                  <button
                    className="btn btn-success"
                    onClick={() => handleRestore(comm)}
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DeletedCommunications;
