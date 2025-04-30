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
import { softDelete } from "./../pages/modules/inbox-modules/softDelete";

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
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "Viewer",
    fname: "",
    mname: "",
    lname: "",
  });

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

  const handleCreateUser = async () => {
    const { email, password, role, fname, mname, lname } = newUser;
    if (!email || !password || !role) {
      alert("Please fill in all required fields.");
      return;
    }
  
    try {
      // Create user in Firebase Auth using secondaryAuth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const uid = userCredential.user.uid;
  
      // Add user details to Firestore
      await setDoc(doc(db, "users", uid), {
        uid,
        email,
        role,
        fname,
        mname,
        password,
        lname,
        profileImage: "", // default profile image or optional
      });
  
      alert("✅ User created successfully!");
      setNewUser({
        email: "",
        password: "",
        role: "Viewer",
        fname: "",
        mname: "",
        lname: "",
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
      const userDoc = doc(db, "users", id);
      const snapshot = await getDoc(userDoc);
      const data = snapshot.exists() ? { id, ...snapshot.data() } : null;

      if (data) {
        await softDelete(data, "users", "deleted_users", "deletedBy");
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

          {/* User Creation Form */}
          <div className="card p-3 mb-4">
            <h4>Create New User</h4>
            <div className="row g-2">
              <div className="col">
                <input
                  type="text"
                  className="form-control"
                  placeholder="First Name"
                  value={newUser.fname}
                  onChange={(e) => setNewUser({ ...newUser, fname: e.target.value })}
                />
              </div>
              <div className="col">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Middle Name"
                  value={newUser.mname}
                  onChange={(e) => setNewUser({ ...newUser, mname: e.target.value })}
                />
              </div>
              <div className="col">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Last Name"
                  value={newUser.lname}
                  onChange={(e) => setNewUser({ ...newUser, lname: e.target.value })}
                />
              </div>
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

          {/* Users Table */}
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
                          <th>Password</th>
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
                              <td>{user.password || "N/A"}</td>
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
