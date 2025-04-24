import { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { softDelete } from "./../pages/modules/inbox-modules/softDelete"; // <- Add this import

type UserType = {
  id: string;
  email: string;
  password?: string;
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
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editData, setEditData] = useState({
    fname: "",
    mname: "",
    lname: "",
    role: "",
    email: "",
    password: "", // ⚠️ if you're storing plain password in Firestore
  });
  const [showPassword, setShowPassword] = useState(false);

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
        await softDelete(data, "users", "deleted_users");
        await deleteDoc(userDoc);
        setUsers((prev) => prev.filter((user) => user.id !== id));
        alert("✅ User deleted and archived successfully!");
      } else {
        alert("❌ User not found.");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("❌ Failed to delete user. Please check permissions or try again later.");
    }
  };

  const handleEditClick = (user: UserType) => {
    setEditingUser(user);
    setEditData({
      fname: user.fname || "",
      mname: user.mname || "",
      lname: user.lname || "",
      role: user.role || "",
      email: user.email || "",
      password: user.password || "", // ⚠️ Only if stored in Firestore
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const updateUserAuth = async (uid: string, email: string, password: string) => {
    const response = await fetch('http://localhost:5000/update-user-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid, email, password }),
    });
  
    // Safely handle empty or invalid JSON response
    let data = null;
    try {
      data = await response.json();
    } catch (err) {
      throw new Error("❌ Failed to parse response from server. Make sure backend is returning JSON.");
    }
  
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || "❌ Unknown error occurred while updating user.");
    }
  
    return data;
  };
    
  const handleUpdate = async () => {
    if (!editingUser) return;
  
    if (!editData.fname.trim() || !editData.lname.trim() || !editData.email.trim()) {
      alert("❗ Please fill in all required fields: First Name, Last Name, and Email.");
      return;
    }
  
    try {
      let authResponse = null;
      const isPasswordChanged = editData.password !== editingUser.password;
  
      if (isPasswordChanged) {
        authResponse = await updateUserAuth(editingUser.id, editData.email, editData.password);
        if (!authResponse || !authResponse.success) {
          alert("❌ Failed to update Firebase Auth credentials.");
          return;
        }
      }
  
      const userRef = doc(db, "users", editingUser.id);
  
      const updatedData: any = {
        fname: editData.fname,
        mname: editData.mname,
        lname: editData.lname,
        role: editData.role,
        email: editData.email,
      };
  
      if (isPasswordChanged) {
        updatedData.password = editData.password;
      }
  
      await updateDoc(userRef, updatedData);
  
      alert("✅ User updated successfully!");
      fetchUsers();
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      alert("❌ Failed to update user credentials.");
    }
  };
      
  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditData({
      fname: "",
      mname: "",
      lname: "",
      role: "",
      email: "",
      password: "",
    });
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
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center">No users found</td>
                          </tr>
                        ) : (
                          filteredUsers.map((user) => (
                            <tr key={user.id}>
                              <td>
                                {user.profileImage ? (
                                  <img src={user.profileImage} alt="profile" width={40} height={40} style={{ borderRadius: "50%" }} />
                                ) : (
                                  "No Image"
                                )}
                              </td>
                              <td>{[user.fname, user.mname, user.lname].filter(Boolean).join(" ") || "N/A"}</td>
                              <td>{user.email}</td>
                              <td>{user.role}</td>
                              <td>
                                <button className="btn btn-primary btn-sm me-1" onClick={() => handleEditClick(user)}>
                                  Edit
                                </button>
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

          {/* Edit Modal */}
          {editingUser && (
            <div className="modal-backdrop">
              <div className="modal-content">
                <h3>Edit User</h3>
                <input
                  type="text"
                  name="fname"
                  placeholder="First Name"
                  value={editData.fname}
                  onChange={handleEditChange}
                  className="form-control mb-2"
                />
                <input
                  type="text"
                  name="mname"
                  placeholder="Middle Name"
                  value={editData.mname}
                  onChange={handleEditChange}
                  className="form-control mb-2"
                />
                <input
                  type="text"
                  name="lname"
                  placeholder="Last Name"
                  value={editData.lname}
                  onChange={handleEditChange}
                  className="form-control mb-2"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={editData.email}
                  onChange={handleEditChange}
                  className="form-control mb-2"
                />
                <div className="input-group mb-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    value={editData.password}
                    onChange={handleEditChange}
                    className="form-control"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <select
                  name="role"
                  value={editData.role}
                  onChange={handleEditChange}
                  className="form-select mb-2"
                >
                  <option value="Admin">Admin</option>
                  <option value="LGU">LGU</option>
                  <option value="Evaluator">Evaluator</option>
                  <option value="Viewer">Viewer</option>
                </select>
                <div className="d-flex justify-content-end">
                  <button className="btn btn-secondary me-2" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                  <button className="btn btn-success" onClick={handleUpdate}>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </section>
    </div>
  );
};

export default UserManagement;
