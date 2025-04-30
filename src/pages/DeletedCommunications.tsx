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
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedComm, setSelectedComm] = useState<any>(null); // Store the communication to restore
  const [successMessage, setSuccessMessage] = useState<string>(""); // State for success message

  const fetchDeleted = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "deleted_communications"));
      const items = snapshot.docs.map(doc => {
        const commData = doc.data();
        const deletedByName = commData.deletedBy || "N/A";
        return { id: doc.id, ...commData, deletedBy: deletedByName };
      });
      setCommunications(items);
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

      // Set success message
      setSuccessMessage("Communication Restored Successfully!");

      // Hide success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 9000);
    } catch (error) {
      console.error("Failed to restore communication:", error);
    }
  };

  const handleRestoreAction = async () => {
    if (selectedComm) {
      await handleRestore(selectedComm); // Proceed with restoring the communication
      setShowConfirm(false); // Close the confirmation modal after restoring
    }
  };

  const handleModalClose = () => {
    setShowConfirm(false); // Close the confirmation modal
  };

  useEffect(() => {
    fetchDeleted();
  }, []);

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h1>Deleted Communications</h1>
              <ul className="breadcrumb">
                <li><a className="active" href="/admin/dashboard">Home</a></li>
                <li><i className="bx bx-chevron-right"></i></li>
                <li><a href="#">Deleted Communications</a></li>
              </ul>
            </div>
          </div>
        </main>

        {loading ? (
          <div className="spinner-overlay">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table table-striped table-hover table-bordered">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Remarks</th>
                  <th>Deadline</th>
                  <th>Deleted At</th>
                  <th>Deleted By</th>
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
                        new Date(comm.deadline.seconds * 1000).toLocaleString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                    </td>
                    <td>
                      {comm.deletedAt?.seconds &&
                        new Date(comm.deletedAt.seconds * 1000).toLocaleString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                    </td>
                    <td>{comm.deletedBy || "Unknown"}</td>
                    <td>
                      <button
                        className="btn btn-success"
                        onClick={() => {
                          setSelectedComm(comm);
                          setShowConfirm(true); // Show confirmation modal for restore
                        }}
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Confirmation Modal */}
      {showConfirm && selectedComm && (
        <div className="modal show fade d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Restore</h5>
                <button type="button" className="btn-close" onClick={handleModalClose}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to restore this communication?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleModalClose}>
                  Cancel
                </button>
                <button type="button" className="btn btn-success" onClick={handleRestoreAction}>
                  Restore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && <div className="restore-success-message">{successMessage}</div>}
    </div>
  );
};

export default DeletedCommunications;
