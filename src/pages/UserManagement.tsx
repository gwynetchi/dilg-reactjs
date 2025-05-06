import { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, secondaryAuth } from "../firebase";
import { softDelete } from "../pages/modules/inbox-modules/softDelete";

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
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [editData, setEditData] = useState({
    fname: "",
    mname: "",
    lname: "",
    role: "",
    email: "",
    password: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
    const [updatedRole, setUpdatedRole] = useState<string>("");
  const [filter, setFilter] = useState("All");
  const [newUser, setNewUser] = useState<Omit<UserType, "id"> & { password: string }>({
    email: "",
    password: "",
    role: "Viewer",
    fname: "",
    mname: "",
    lname: "",
    profileImage: "",
  });  
  const [showConfirm, setShowConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" | "warning" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

    // Set up real-time listener for users collection
    useEffect(() => {
      setLoading(true);
      const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
        const userList: UserType[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as UserType[];
        setUsers(userList);
        setLoading(false);
      }, (error) => {
        console.error("Error listening to users:", error);
        showNotification("❌ Failed to listen to users updates.", "error");
        setLoading(false);
      });
  
      // Clean up the listener when component unmounts
      return () => unsubscribe();
    }, []);
  
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const userList: UserType[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as UserType[];
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
      showNotification("❌ Failed to fetch users.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { role: updatedRole });

    setUsers(prev => prev.map(user => user.id === userId ? { ...user, role: updatedRole } : user));
    setEditingUserId(null);
    showNotification("✅ Role updated successfully!", "success");
  } catch (error) {
    console.error("Error updating role:", error);
    showNotification("❌ Failed to update role.", "error");
  }
};


  const handleCreateUser = async () => {
    const { email, password, role, fname, mname, lname } = newUser;

    if (!email || !password || !role) {
      showNotification("⚠️ Please fill in all required fields.");
      return;
    }

    const confirm = window.confirm("Proceed to create this user?");
    if (!confirm) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        uid,
        email,
        role,
        fname,
        mname,
        lname,
        password,
        profileImage: "",
      });

      showNotification("✅ User created successfully!");
      setNewUser({
        email: "",
        password: "",
        role: "Viewer",
        fname: "",
        mname: "",
        lname: "",
        profileImage: "",
      });
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error.message);
      showNotification("❌ Failed to create user: " + error.message);
    }
  };

  const handleDeleteClick = (id: string) => {
    setUserToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async (id: string) => {
    setShowConfirm(false);

    try {
      const userDoc = doc(db, "users", id);
      const snapshot = await getDoc(userDoc);
      const data = snapshot.exists() ? { id, ...snapshot.data() } : null;

      if (data) {
        await softDelete(data, "users", "deleted_users");
        await deleteDoc(userDoc);
        setUsers((prev) => prev.filter((user) => user.id !== id));
        showNotification("✅ User Deleted and Archived Successfully!", "success");
      } else {
        showNotification("❌ User not found", "error");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      showNotification("❌ Failed to Delete User! Please check permissions or try again later.", "error");
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
      password: user.password || "",
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
      showNotification("❗ Please fill in all required fields: First Name, Last Name, and Email.", "warning");
      return;
    }

    try {
      let authResponse = null;
      const isPasswordChanged = editData.password !== editingUser.password;

      if (isPasswordChanged) {
        authResponse = await updateUserAuth(editingUser.id, editData.email, editData.password);
        if (!authResponse || !authResponse.success) {
          showNotification("❌ Failed to Update Firebase Auth Credentials", "error");
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

      showNotification("✅ User Updated Successfully!", "success");
      fetchUsers();
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      showNotification("❌ Failed to Update User Credentials", "error");
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
  const filteredUsers = filter === "All"
  ? users
  : users.filter((user) => user.role === filter);

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
                <li><span>User Management</span></li>
              </ul>
            </div>
          </div>

          {/* Create User Form */}
          <div className="card p-3 mb-4">
            <h4>Create New User</h4>
            <div className="row g-2">
              {["fname", "mname", "lname"].map((field) => (
                <div className="col" key={field}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={field === "fname" ? "First Name" : field === "mname" ? "Middle Name" : "Last Name"}
                    value={newUser[field as keyof typeof newUser]}
                    onChange={(e) => setNewUser({ ...newUser, [field]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div className="row g-2 mt-2">
              <div className="col">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="col">
                <input
                  type="password"
                  className="form-control"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div className="col">
                <select
                  className="form-select"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="Admin">Admin</option>
                  <option value="Evaluator">Evaluator</option>
                  <option value="LGU">LGU</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <div className="col">
                <button className="btn btn-primary w-100" onClick={handleCreateUser}>
                  Create User
                </button>
              </div>
            </div>
          </div>

          {/* User Table */}
          <div className="relative-container">
            <div className="table-data">
              <div className="order">
                <div className="head d-flex justify-content-between align-items-center">
                  <h3>Registered Users</h3>
                  <select
                    className="form-select form-select-sm w-auto"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="All">All Roles</option>
                    <option value="Admin">Admin</option>
                    <option value="Evaluator">Evaluator</option>
                    <option value="LGU">LGU</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>

                {loading ? (
                  <div className="spinner-overlay">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <div className="table-responsive mt-3">
                    <table className="table table-striped table-hover table-bordered">
                      <thead>
                        <tr>
                          <th>Profile</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Password</th>
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
                                  <img
                                    src={user.profileImage}
                                    alt="Profile"
                                    width={40}
                                    height={40}
                                    style={{ borderRadius: "50%" }}
                                  />
                                ) : (
                                  <span className="text-muted">No Image</span>
                                )}
                              </td>
                              <td>{[user.fname, user.mname, user.lname].filter(Boolean).join(" ") || "N/A"}</td>
                              <td>{user.email}</td>
                              <td>{user.password}</td>
                              <td>{user.role}</td>
                              <td>
  {editingUserId === user.id ? (
    <>
      <select
        value={updatedRole}
        onChange={(e) => setUpdatedRole(e.target.value)}
        className="form-select form-select-sm d-inline-block w-auto me-2"
      >
        <option value="Admin">Admin</option>
        <option value="Evaluator">Evaluator</option>
        <option value="LGU">LGU</option>
        <option value="Viewer">Viewer</option>
      </select>
      <button className="btn btn-success btn-sm me-1" onClick={() => handleSaveRole(user.id)}>
        Save
      </button>
      <button className="btn btn-secondary btn-sm" onClick={() => setEditingUserId(null)}>
        Cancel
      </button>
    </>
  ) : (
    <>
      <button className="btn btn-primary btn-sm me-1" onClick={() => {
        setEditingUserId(user.id);
        setUpdatedRole(user.role);
      }}>
        Edit Role
      </button>
      <button className="btn btn-warning btn-sm me-1" onClick={() => handleEditClick(user)}>
        Edit Info
      </button>
      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteClick(user.id)}>
        Delete
      </button>
    </>
  )}
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

          {editingUser && (
            <div className="modal-backdrop">
              <div className="modal-content">
                <h3>Edit User</h3>
                <input type="text" name="fname" placeholder="First Name" value={editData.fname} onChange={handleEditChange} className="form-control mb-2" />
                <input type="text" name="mname" placeholder="Middle Name" value={editData.mname} onChange={handleEditChange} className="form-control mb-2" />
                <input type="text" name="lname" placeholder="Last Name" value={editData.lname} onChange={handleEditChange} className="form-control mb-2" />
                <input type="email" name="email" placeholder="Email" value={editData.email} onChange={handleEditChange} className="form-control mb-2" />
                <div className="input-group mb-2">
                  <input type={showPassword ? "text" : "password"} name="password" placeholder="Password" value={editData.password} onChange={handleEditChange} className="form-control" />
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPassword((prev) => !prev)}>{showPassword ? "Hide" : "Show"}</button>
                </div>
                <select name="role" value={editData.role} onChange={handleEditChange} className="form-select mb-2">
                  <option value="Admin">Admin</option>
                  <option value="LGU">LGU</option>
                  <option value="Evaluator">Evaluator</option>
                  <option value="Viewer">Viewer</option>
                </select>
                <div className="d-flex justify-content-end">
                  <button className="btn btn-secondary me-2" onClick={handleCancelEdit}>Cancel</button>
                  <button className="btn btn-success" onClick={handleUpdate}>Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {showConfirm && (
            <div className="modal show fade d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
              <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Confirm Deletion</h5>
                    <button type="button" className="btn-close" onClick={() => setShowConfirm(false)}></button>
                  </div>
                  <div className="modal-body">
                    <p>Are you sure you want to delete this user?</p>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => userToDelete && confirmDelete(userToDelete)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notification pop-up */}
          {notification && (
            <div
              className={`alert alert-${notification.type} position-fixed top-0 end-0 m-3 shadow`}
              role="alert"
              style={{ zIndex: 1050 }}
            >
              {notification.message}
            </div>
          )}
        </main>
      </section>
    </div>
  );
};

export default UserManagement;
