import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

const DeletedUsers = () => {
  const [deletedUsers, setDeletedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDeletedUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "deleted_users"));
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDeletedUsers(users);
    } catch (err) {
      console.error("Error fetching deleted users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreUser = async (user: any) => {
    try {
      // Move user to active users collection
      await setDoc(doc(db, "users", user.id), {
        ...user,
        restoredAt: new Date(),
      });

      // Delete from deleted_users
      await deleteDoc(doc(db, "deleted_users", user.id));

      // Refresh UI
      setDeletedUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (error) {
      console.error("Failed to restore user:", error);
    }
  };

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

  return (
    <div className="dashboard-container">
      <h2>Deleted Users</h2>
      {loading ? <p>Loading...</p> : (
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Password</th>
              <th>Deleted At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deletedUsers.map(user => (
              <tr key={user.id}>
                <td>{`${user.fname || ""} ${user.mname || ""} ${user.lname || ""}`.trim()}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.password}</td>
                <td>
                  {user.deletedAt?.seconds &&
                    new Date(user.deletedAt.seconds * 1000).toLocaleString()}
                </td>
                <td>
                  <button
                    className="btn btn-success"
                    onClick={() => handleRestoreUser(user)}
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

export default DeletedUsers;
