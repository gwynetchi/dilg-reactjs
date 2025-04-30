import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

const DeletedUsers = () => {
  const [deletedUsers, setDeletedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false); // ✅ NEW STATE

  const fetchDeletedUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "deleted_users"));
      const users = await Promise.all(
        snapshot.docs.map(async (document) => {
          const userData = document.data();
          console.log(userData);
          const deletedByUID = userData.deletedBy;
          let deletedByName = deletedByUID;

          const userDocRef = doc(db, "users", deletedByUID);
          const userSnapshot = await getDoc(userDocRef);
          if (userSnapshot.exists()) {
            const user = userSnapshot.data();
            deletedByName =
              `${user.fname || ""} ${user.mname || ""} ${user.lname || ""}`.trim() ||
              user.email ||
              deletedByUID;
          }

          return { id: document.id, ...userData, deletedByName };
        })
      );
      setDeletedUsers(users);
    } catch (err) {
      console.error("Error fetching deleted users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreUser = async (user: any) => {
    try {
      await setDoc(doc(db, "users", user.id), {
        ...user,
        restoredAt: new Date(),
      });

      await deleteDoc(doc(db, "deleted_users", user.id));

      setDeletedUsers((prev) => prev.filter((u) => u.id !== user.id));
      setShowConfirm(false);

      // ✅ Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error("Failed to restore user:", error);
    }
  };

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

  return (
    <div className="dashboard-container">
      {/* ✅ Success Message Display */}
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
                        {user.deletedAt?.seconds &&
                          new Date(user.deletedAt.seconds * 1000).toLocaleString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                          })}
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
            </div>
          )}
        </main>
      </section>

      {/* Confirmation Modal */}
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
