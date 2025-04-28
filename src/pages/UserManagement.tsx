import { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { softDelete } from "./../pages/modules/inbox-modules/softDelete";

type UserType = {
  id: string;
  email: string;
  password?: string;  // Include password field
  role: string;
  fname?: string;
  mname?: string;
  lname?: string;
  profileImage?: string;
};

const UserManagement = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList: UserType[] = [];
      querySnapshot.forEach((docSnap) => {
        usersList.push({ id: docSnap.id, ...docSnap.data() } as UserType);
      });
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this user?");
    if (!confirmDelete) return;

    try {
      const userDoc = doc(db, "users", id);
      const snapshot = await getDoc(userDoc);
      const data = snapshot.exists() ? { id, ...snapshot.data() } : null;

      if (data) {
        // Archive the user by soft deleting
        await softDelete(data, "users", "deleted_users", "deletedBy");
        // Permanently delete the user from Firestore
        await deleteDoc(userDoc);
        setUsers((prev) => prev.filter((user) => user.id !== id));
        alert("✅ User deleted and archived successfully!");
      } else {
        alert("❌ User not found.");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("❌ Failed to delete user. Please try again later.");
    }
  };

  const filteredUsers = filter === "All" ? users : users.filter((user) => user.role === filter);

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h1>User Management</h1>
              <ul className="breadcrumb">
                <li><a className="active" href="/admin/dashboard">Home</a></li>
                <li><i className="bx bx-chevron-right"></i></li>
                <li><a href="#">User Management</a></li>
              </ul>
            </div>
          </div>

          <div className="relative-container">
            <div className="table-data">
              <div className="order">
                <div className="head">
                  <h3>Registered Users</h3>
                  <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-select form-select-sm w-auto">
                    <option value="All">All Roles</option>
                    <option value="Admin">Admin</option>
                    <option value="LGU">LGU</option>
                    <option value="Viewer">Viewer</option>
                    <option value="Evaluator">Evaluator</option>
                  </select>
                </div>

                {loading ? (
                  <p>Loading users...</p>
                ) : (
                  <div className="table-responsive mt-3">
                    <table className="table table-striped table-hover table-bordered">
                      <thead>
                        <tr>
                          <th>Profile</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Password</th> {/* Added Password Column */}
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center">No users found</td>
                          </tr>
                        ) : (
                          filteredUsers.map((user) => (
                            <tr key={user.id}>
                              <td>
                                {user.profileImage ? (
                                  <img src={user.profileImage} alt="Profile" width={40} height={40} style={{ borderRadius: "50%" }} />
                                ) : (
                                  "No Image"
                                )}
                              </td>
                              <td>{[user.fname, user.mname, user.lname].filter(Boolean).join(" ") || "N/A"}</td>
                              <td>{user.email}</td>
                              <td>{user.role}</td>
                              <td>{user.password || "N/A"}</td> {/* Display Password */}
                              <td>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user.id)}>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </section>
    </div>
  );
};

export default UserManagement;
