import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
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
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
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
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    const { email, password, role, fname, mname, lname } = newUser;

    if (!email || !password || !role) {
      alert("⚠️ Please fill in all required fields.");
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

      alert("✅ User created successfully!");
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
      alert("❌ Failed to create user: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this user?");
    if (!confirmDelete) return;

    try {
      const userRef = doc(db, "users", id);
      const snapshot = await getDoc(userRef);
      const userData = snapshot.exists() ? { id, ...snapshot.data() } : null;

      if (userData) {
        await softDelete(userData, "users", "deleted_users", "deletedBy");
        await deleteDoc(userRef);
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

  const filteredUsers = filter === "All" ? users : users.filter((u) => u.role === filter);

  const handleSaveRole = async (id: string) => {
    if (!updatedRole) {
      alert("⚠️ Please select a role.");
      return;
    }

    try {
      const userRef = doc(db, "users", id);
      await setDoc(userRef, { role: updatedRole }, { merge: true });
      setUsers((prev) =>
        prev.map((user) =>
          user.id === id ? { ...user, role: updatedRole } : user
        )
      );
      alert("✅ Role updated successfully!");
      setEditingUserId(null);
    } catch (error) {
      console.error("Error updating role:", error);
      alert("❌ Failed to update role. Please try again later.");
    }
  };

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
                  <p>🔄 Loading users...</p>
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
      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user.id)}>
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
        </main>
      </section>
    </div>
  );
};

export default UserManagement;
