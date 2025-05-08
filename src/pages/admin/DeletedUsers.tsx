import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  query
} from "firebase/firestore";
import { db } from "../../firebase";
import { deleteUserAccount } from "../../utils/api";

const DeletedUsers = () => {
  const [deletedUsers, setDeletedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const q = query(collection(db, "deleted_users"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const users = await Promise.all(
          snapshot.docs.map(async (document) => {
            const userData = document.data();
            
            let deletedByUID = typeof userData.deletedBy === 'string' 
              ? userData.deletedBy 
              : userData.deletedBy?.id;
            
            let deletedByName = typeof userData.deletedBy === 'string'
              ? userData.deletedBy
              : userData.deletedBy?.name || userData.deletedBy?.email;

            if (deletedByUID && !deletedByName) {
              try {
                const userDocRef = doc(db, "users", deletedByUID);
                const userSnapshot = await getDoc(userDocRef);
                if (userSnapshot.exists()) {
                  const user = userSnapshot.data();
                  deletedByName = 
                    `${user.fname || ""} ${user.mname || ""} ${user.lname || ""}`.trim() ||
                    user.email ||
                    deletedByUID;
                }
              } catch (err) {
                console.warn("Couldn't fetch deleter details:", err);
              }
            }

            return { 
              id: document.id, 
              ...userData,
              deletedByName: deletedByName || "Unknown",
              deletedAt: userData.deletedAt?.toDate?.() || null
            };
          })
        );
        setDeletedUsers(users);
      } catch (err) {
        console.error("Error fetching deleted users:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleRestoreUser = async (user: any) => {
    try {
      const { deletedAt, deletedBy, originalCollection, ...userData } = user;
      
      await setDoc(doc(db, "users", user.id), {
        ...userData,
        restoredAt: new Date(),
        createdAt: userData.createdAt || serverTimestamp()
      });

      await deleteDoc(doc(db, "deleted_users", user.id));
      setShowConfirm(false);
      setSuccessMessage("User restored successfully!");
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error("Failed to restore user:", error);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedUser) return;
    
    try {
      // Call the permanent delete API directly
      const response = await deleteUserAccount(selectedUser.id, true);
      
      if (response.success) {
        setShowDeleteConfirm(false);
        setSuccessMessage(response.message || "User permanently deleted from system");
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        
        // Remove from local state
        setDeletedUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      }
    } catch (error) {
      console.error("Permanent delete failed:", error);
      setSuccessMessage(error instanceof Error ? error.message : "Deletion failed");
      setShowSuccessMessage(true);
    }
  };
  
  return (
    <div className="dashboard-container">
      {showSuccessMessage && (
        <div className="alert alert-success d-flex align-items-center gap-2 mb-3">
          <i className="bx bx-check-circle fs-4"></i>
          <div>{successMessage}</div>
        </div>
      )}

      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h1>Deleted Users</h1>
              <ul className="breadcrumb">
                <li>
                  <a className="active" href="/admin/dashboard">
                    Home
                  </a>
                </li>
                <li>
                  <i className="bx bx-chevron-right"></i>
                </li>
                <li>
                  <a href="#">Deleted Users</a>
                </li>
              </ul>
            </div>
          </div>

          {loading ? (
            <div className="spinner-overlay">
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="inbox-container">
              {deletedUsers.length === 0 ? (
                <div className="empty-state text-center py-5">
                  <i className="bx bx-user-x fs-1 text-muted mb-3"></i>
                  <h4 className="text-muted">No Deleted Users</h4>
                  <p className="text-muted">There are currently no deleted users in the system</p>
                </div>
              ) : (
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Deleted At</th>
                      <th>Deleted By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          {`${user.fname || ""} ${user.mname || ""} ${user.lname || ""}`.trim()}
                        </td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td>
                          {user.deletedAt
                            ? user.deletedAt.toLocaleString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "numeric",
                                minute: "numeric",
                              })
                            : "Unknown"}
                        </td>
                        <td>{user.deletedByName || "System"}</td>
                        <td className="d-flex gap-2">
                          <button
                            className="btn btn-success"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowConfirm(true);
                            }}
                          >
                            <i className="bx bx-undo me-1"></i> Restore
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteConfirm(true);
                            }}
                          >
                            <i className="bx bx-trash me-1"></i> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </main>
      </section>

      {/* Restore Confirmation Modal */}
      {showConfirm && selectedUser && (
        <div
          className="modal show fade d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Restore</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConfirm(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to restore user: <strong>{selectedUser.fname} {selectedUser.lname}</strong>?</p>
                <p className="text-muted">This will move them back to the active users list.</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => handleRestoreUser(selectedUser)}
                >
                  <i className="bx bx-undo me-1"></i> Restore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {showDeleteConfirm && selectedUser && (
        <div
          className="modal show fade d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Permanent Deletion</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteConfirm(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger">
                  <i className="bx bx-error-circle me-2"></i>
                  <strong>Warning:</strong> This action cannot be undone!
                </div>
                <p>Are you sure you want to permanently delete user: <strong>{selectedUser.fname} {selectedUser.lname}</strong>?</p>
                <p className="text-muted">All user data will be permanently removed from the system.</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handlePermanentDelete}
                >
                  <i className="bx bx-trash me-1"></i> Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletedUsers;