import { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, secondaryAuth } from "../firebase";
import { softDelete } from "../pages/modules/inbox-modules/softDelete";

interface EditUserData {
  fname: string;
  mname: string;
  lname: string;
  role: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

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
  const currentUserId = auth.currentUser?.uid || null; // Get the current user's ID
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [editData, setEditData] = useState<EditUserData>({
    fname: "",
    mname: "",
    lname: "",
    role: "",
    email: "",
    password: "",
    confirmPassword: "",
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
      
      if (!snapshot.exists()) {
        showNotification("❌ User not found", "error");
        return;
      }
  
      const data = { id, ...snapshot.data() };
      console.log("Archiving user:", id, data);
  
      // Archive first
      await softDelete(data, "users", "deleted_users");
      console.log("Archive successful, now deleting original...");
  
      // Then delete original
      await deleteDoc(userDoc);
      setUsers((prev) => prev.filter((user) => user.id !== id));
      
      showNotification("✅ User Deleted and Archived Successfully!", "success");
    } catch (error) {
      console.error("Error in user deletion process:", error);
      showNotification("❌ Failed to Delete User! " + (error as any).message, "error");
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
      password: "", // Don't pre-fill password for security
      confirmPassword: "",
    });
  };
  
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateEditForm = (): boolean => {
    if (!editData.fname.trim() || !editData.lname.trim()) {
      showNotification("First name and last name are required", "warning");
      return false;
    }
  
    if (!editData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      showNotification("Please enter a valid email address", "warning");
      return false;
    }
  
    // Only validate password if it's being changed
    if (editData.password) {
      if (editData.password.length < 6) {
        showNotification("Password must be at least 6 characters", "warning");
        return false;
      }
  
      if (editData.password !== editData.confirmPassword) {
        showNotification("Passwords do not match", "warning");
        return false;
      }
    }
  
    return true;
  };
  
  
// Replace updateUserAuth function with:
const updateUserAuth = async (uid: string, email: string, password: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');

    const token = await currentUser.getIdToken();
    
    const response = await fetch('http://localhost:5000/api/users/update-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ uid, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Error updating auth:', error);
    throw error;
  }
};
const handleUpdate = async () => {
  if (!editingUser || !validateEditForm()) return;

  try {
    // Prepare updates for Firestore
    const updates: Partial<UserType> = {
      fname: editData.fname,
      mname: editData.mname,
      lname: editData.lname,
      role: editData.role,
      email: editData.email,
      password: editData.password,
    };

    // Only update auth if email or password changed
    if (editData.email !== editingUser.email || editData.password) {
      await updateUserAuth(
        editingUser.id,
        editData.email,
        editData.password || '' // Send empty string if no password change
      );
    }

    // Update Firestore
    await updateDoc(doc(db, "users", editingUser.id), updates);

    showNotification("✅ User updated successfully!", "success");
    setEditingUser(null);
    fetchUsers();
  } catch (error: any) {
    console.error("Update error:", error);
    let errorMessage = "Failed to update user";
    if (error.message.includes("email-already-in-use")) {
      errorMessage = "Email already in use by another account";
    } else if (error.message) {
      errorMessage = error.message;
    }
    showNotification(`❌ ${errorMessage}`, "error");
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

  const searchUsers = (users: UserType[], term: string) => {
    if (!term) return users;
  
    const lowerTerm = term.toLowerCase();
    return users.filter(user => {
      return (
        (user.fname?.toLowerCase().includes(lowerTerm) || 
         user.mname?.toLowerCase().includes(lowerTerm) || 
         user.lname?.toLowerCase().includes(lowerTerm) ||
         user.email.toLowerCase().includes(lowerTerm) ||
         user.role.toLowerCase().includes(lowerTerm))
      );
    });
  };

  const filteredUsers = searchUsers(
    filter === "All" ? users : users.filter((user) => user.role === filter),
    searchTerm
  );
  
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
                <div className="d-flex gap-2">
                  <div className="search-box">
                    <i className="bx bx-search"></i>
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
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
      <button 
    className="btn btn-danger btn-sm" 
    onClick={() => handleDeleteClick(user.id)}
    disabled={user.id === currentUserId}
    title={user.id === currentUserId ? "Cannot delete your own account" : ""}
  >
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
  <div className="modal show fade d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
    <div className="modal-dialog modal-lg">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Edit User: {editingUser.email}</h5>
          <button type="button" className="btn-close" onClick={handleCancelEdit}></button>
        </div>
        <div className="modal-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">First Name</label>
              <input
                type="text"
                name="fname"
                className="form-control"
                value={editData.fname}
                onChange={handleEditChange}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Middle Name</label>
              <input
                type="text"
                name="mname"
                className="form-control"
                value={editData.mname}
                onChange={handleEditChange}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                name="lname"
                className="form-control"
                value={editData.lname}
                onChange={handleEditChange}
                required
              />
            </div>
            
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={editData.email}
                onChange={handleEditChange}
                required
              />
            </div>
            
            <div className="col-md-6">
              <label className="form-label">Role</label>
              <select
                name="role"
                className="form-select"
                value={editData.role}
                onChange={handleEditChange}
              >
                <option value="Admin">Admin</option>
                <option value="Evaluator">Evaluator</option>
                <option value="LGU">LGU</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
            
            <div className="col-md-6">
              <label className="form-label">New Password</label>
              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="form-control"
                  value={editData.password}
                  onChange={handleEditChange}
                  placeholder="Leave blank to keep current"
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <small className="text-muted">Minimum 6 characters</small>
            </div>
            
            <div className="col-md-6">
              <label className="form-label">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                className="form-control"
                value={editData.confirmPassword}
                onChange={handleEditChange}
                placeholder="Confirm new password"
                disabled={!editData.password}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleCancelEdit}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleUpdate}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
)}
  
            {/* Confirmation Modal for Deletion */}
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
