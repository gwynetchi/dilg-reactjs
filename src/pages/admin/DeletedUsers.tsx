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

const DeletedUsers = () => {
  const [deletedUsers, setDeletedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

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

    // Clean up the listener when component unmounts
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
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error("Failed to restore user:", error);
    }
  };

  return (
    <div className="dashboard-container">
      {showSuccessMessage && (
        <div className="restore-success-message">
          User Restored Successfully!
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
            <div className="table-wrapper">
              {deletedUsers.length === 0 ? (
                <div className="no-deleted-users">
                  <p>No Deleted Users</p>
                </div>
              ) : (
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Password</th>
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
                        <td>{user.password}</td>
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
                        <td>{user.deletedByName || "N/A"}</td>
                        <td>
                          <button
                            className="btn btn-success"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowConfirm(true);
                            }}
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
          )}
        </main>
      </section>

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
                <p>Are you sure you want to restore this user?</p>
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
                  Restore
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