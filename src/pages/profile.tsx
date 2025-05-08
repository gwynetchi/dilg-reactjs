import { useState, useEffect } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import "../styles/components/dashboard.css";
import { updateUserCredentials } from "../utils/api";
import { getFirebaseErrorMessage } from "../utils/firebaseErrors";

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [fname, setFirstName] = useState("");
  const [mname, setMiddleName] = useState("");
  const [lname, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [role, setRole] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [alert, setAlert] = useState<{ message: string; type: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [originalProfileImage, setOriginalProfileImage] = useState("");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setEmail(currentUser.email || "");
        listenToUserProfile(currentUser.uid);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const listenToUserProfile = (uid: string) => {
    const userDocRef = doc(db, "users", uid);
    return onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFirstName(data.fname || "");
        setMiddleName(data.mname || "");
        setLastName(data.lname || "");
        setProfileImage(data.profileImage || "");
        setRole(data.role || "");
        setOriginalProfileImage(data.profileImage || "");
      }
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setProfileImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      showAlert("You must be logged in to update your profile", "danger");
      return;
    }
  
    if (!fname.trim() || !lname.trim()) {
      showAlert("First name and last name are required!", "warning");
      return;
    }
  
    // Add password validation
    if (password.trim() !== "" && password.length <= 6) {
      showAlert("Password must be greater than 6 characters!", "warning");
      return;
    }
  
    setLoading(true);
    setUploadingImage(true);
  
    try {
      let uploadedImageUrl = profileImage;
  
      // 1. Upload new image if selected
      if (selectedImageFile) {
        const formData = new FormData();
        formData.append("file", selectedImageFile);
        formData.append("upload_preset", "uploads");
        formData.append("folder", `profilePictures/${user.uid}`);
  
        const res = await fetch("https://api.cloudinary.com/v1_1/dr5c99td8/image/upload", {
          method: "POST",
          body: formData,
        });
  
        if (!res.ok) throw new Error("Image upload failed");
        
        const data = await res.json();
        uploadedImageUrl = data.secure_url;
      }
  
      // 2. Prepare updates for Firestore
      const userUpdates = {
        fname,
        mname: mname || "",
        lname,
        profileImage: uploadedImageUrl,
        ...(user.email !== email && { email }), // Only include email if changed
      };
  
      // 3. Update both Auth and Firestore in parallel
      const [_] = await Promise.all([
        // Update authentication (email/password)
        (user.email !== email || password.trim() !== "") 
          ? updateUserCredentials(user.uid, email, password.trim() || "")
          : Promise.resolve(),  
  
        // Update Firestore document
        setDoc(doc(db, "users", user.uid), userUpdates, { merge: true })
      ]);
  
      showAlert("Profile Updated Successfully!", "success");
      setSelectedImageFile(null);
      setIsEditing(false);
      setPassword("");
  
    } catch (error: any) {
      console.error("Error Updating Profile:", error);
      
      // Revert UI state if update failed
      if (user?.email !== email) {
        setEmail(user?.email || "");
      }
      if (selectedImageFile) {
        setProfileImage(originalProfileImage);
      }
  
      // Use the Firebase error message utility
      const errorMessage = getFirebaseErrorMessage(error.code || error.message);
      showAlert(errorMessage || "Failed to update profile. Please try again.", "danger");
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };
    
  const showAlert = (message: string, type: string) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return "✔️";
      case "danger": return "❌";
      case "warning": return "⚠️";
      default: return "ℹ️";
    }
  };

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h1>Profile</h1>
              <ul className="breadcrumb">
                <li>
                  <a className="active" href="/Dashboards">Home</a>
                </li>
                <li><i className="bx bx-chevron-right"></i></li>
                <li><a href={`/profile/${user?.uid}`}>Profile</a></li>
              </ul>
            </div>
          </div>

          {alert && (
            <div className={`custom-alert alert-${alert.type}`}>
              <span className="alert-icon">{getIcon(alert.type)}</span>
              <span>{alert.message}</span>
            </div>
          )}

          <div className="relative-container">
            <div className="table-data">
              <div className="order">
                <div className="head d-flex justify-content-between align-items-center">
                  <h3>Personal Information</h3>
                  <div className="action-buttons d-flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          className="btn btn-success btn-sm d-flex align-items-center gap-1 px-3 py-2 shadow-sm"
                          onClick={handleSubmit}
                          disabled={loading || uploadingImage}
                        >
                          {uploadingImage || loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                              <span>{uploadingImage ? "Uploading..." : "Saving..."}</span>
                            </>
                          ) : (
                            <>
                              <i className="bx bx-save"></i>
                              <span>Save Changes</span>
                            </>
                          )}
                        </button>
                        <button
                          className="btn btn-light btn-sm d-flex align-items-center gap-1 px-3 py-2 shadow-sm"
                          onClick={() => {
                            setProfileImage(originalProfileImage);
                            setSelectedImageFile(null);
                            setIsEditing(false);
                            setPassword("");
                          }}
                        >
                          <i className="bx bx-x"></i>
                          <span>Cancel</span>
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm d-flex align-items-center gap-1 px-3 py-2 shadow-sm"
                        onClick={() => {
                          setOriginalProfileImage(profileImage);
                          setIsEditing(true);
                        }}
                      >
                        <i className="bx bx-edit-alt"></i>
                        <span>Edit Profile</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="container mt-4">
                  <div className="row">
                    <div className="col-md-3">
                      <div className="profile-image-container text-center mb-3">
                        <label className="form-label fw-bold">Profile Picture</label>
                        <div className="profile-image-wrapper my-3">
                          {profileImage ? (
                            <img
                              src={profileImage}
                              alt="Profile"
                              className="img-fluid rounded-circle shadow"
                              style={{
                                width: 150,
                                height: 150,
                                objectFit: "cover",
                                border: "4px solid #f8f9fa",
                              }}
                            />
                          ) : (
                            <div
                              className="placeholder-profile shadow"
                              style={{
                                width: 150,
                                height: 150,
                                backgroundColor: "#e9ecef",
                                borderRadius: "50%",
                                margin: "0 auto",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "4px solid #f8f9fa",
                              }}
                            >
                              <i className="bx bx-user" style={{ fontSize: "48px", color: "#adb5bd" }}></i>
                            </div>
                          )}
                        </div>
                        {isEditing && (
                          <div className="mt-2">
                            <div className="custom-file-upload">
                              <input
                                id="file-upload"
                                type="file"
                                className="form-control"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploadingImage}
                              />
                              {uploadingImage && (
                                <div className="text-center mt-2">
                                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                  </div>
                                  <small className="text-muted d-block mt-1">Uploading image...</small>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-9">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body">
                          <div className="row">
                            <div className="col-md-12 mb-3">
                              <label className="form-label fw-bold">Role:</label>
                              <input type="text" className="form-control bg-light" value={role} disabled />
                            </div>

                            <div className="col-md-4 mb-3">
                              <label className="form-label fw-bold">First Name:</label>
                              <input
                                type="text"
                                className={`form-control ${isEditing ? "" : "bg-light"}`}
                                value={fname}
                                onChange={(e) => setFirstName(e.target.value)}
                                disabled={!isEditing || loading}
                              />
                            </div>

                            <div className="col-md-4 mb-3">
                              <label className="form-label fw-bold">Middle Name:</label>
                              <input
                                type="text"
                                className={`form-control ${isEditing ? "" : "bg-light"}`}
                                value={mname}
                                onChange={(e) => setMiddleName(e.target.value)}
                                disabled={!isEditing || loading}
                              />
                            </div>

                            <div className="col-md-4 mb-3">
                              <label className="form-label fw-bold">Last Name:</label>
                              <input
                                type="text"
                                className={`form-control ${isEditing ? "" : "bg-light"}`}
                                value={lname}
                                onChange={(e) => setLastName(e.target.value)}
                                disabled={!isEditing || loading}
                              />
                            </div>

                            <div className="col-md-6 mb-3">
                              <label className="form-label fw-bold">Email:</label>
                              <input
                                type="email"
                                className={`form-control ${isEditing ? "" : "bg-light"}`}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={!isEditing || loading}
                              />
                            </div>

                            <div className="col-md-6 mb-3">
                              <label className="form-label fw-bold">New Password:</label>
                              <input
                                type="password"
                                className={`form-control ${isEditing ? "" : "bg-light"}`}
                                placeholder="Leave blank to keep current password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={!isEditing || loading}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </section>
    </div>
  );
};

export default Profile;
