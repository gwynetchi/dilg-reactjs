import { useState, useEffect } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import "../styles/components/dashboard.css";

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [fname, setFirstName] = useState("");
  const [mname, setMiddleName] = useState("");
  const [lname, setLastName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [role, setRole] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [alert, setAlert] = useState<{ message: string; type: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
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
        setRole(data.role || ""); // 👈 Add this
      }
    });
  };
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
  
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "uploads"); // replace with your actual preset
    formData.append("folder", "profile_pictures");
  
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dr5c99td8/image/upload", {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
      setProfileImage(data.secure_url);
  
      // 🔥 Save the image URL to Firestore immediately
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { profileImage: data.secure_url }, { merge: true });
  
      showAlert("Profile picture uploaded!", "success");
    } catch (err) {
      console.error("Image upload failed", err);
      showAlert("Failed to upload image.", "danger");
    } finally {
      setUploadingImage(false);
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

    setLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        { fname, mname: mname || "", lname, profileImage },
        { merge: true }
      );

      showAlert("Profile Updated Successfully!", "success");
      setIsEditing(false);
    } catch (error) {
      console.error("Error Saving Profile Information:", error);
      showAlert("Could not save profile. Please try again!", "danger");
    } finally {
      setLoading(false);
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
                <li><a className="active" href="/Dashboards">Home</a></li>
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
                <div className="head">
                  <h3>Information</h3>
                  <div className="d-flex justify-content-between">
                    {isEditing ? (
                      <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : "Save Profile"}
                      </button>
                    ) : (
                      <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
                        Edit
                      </button>
                    )}

                    {isEditing && (
                      <button className="btn btn-light btn-sm" onClick={() => setIsEditing(false)}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="container">
                  <div className="row">
                    {/* Profile Image */}
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Profile Picture:</label>
                      <div>
                        {profileImage && (
                          <img src={profileImage} alt="Profile" style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover" }} />
                        )}
                      </div>
                      {isEditing && (
                        <input
                          type="file"
                          className="form-control form-control-sm mt-2"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                      )}
                    </div>

                    {/* First Name */}
                    <div className="col-md-4 mb-2">
                      <label className="form-label">First Name:</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Enter first name"
                        value={fname}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={!isEditing || loading}
                      />
                    </div>

                    {/* Middle Name */}
                    <div className="col-md-4 mb-2">
                      <label className="form-label">Middle Name:</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Enter middle name"
                        value={mname}
                        onChange={(e) => setMiddleName(e.target.value)}
                        disabled={!isEditing || loading}
                      />
                    </div>

                    {/* Last Name */}
                    <div className="col-md-4 mb-2">
                      <label className="form-label">Last Name:</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Enter last name"
                        value={lname}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={!isEditing || loading}
                      />
                    </div>
                    {/* Role */}
                    <div className="col-md-4 mb-2">
                      <label className="form-label">Role:</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={role}
                        disabled
                      />
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
