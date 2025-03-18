import { useState, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase"; // Import Firebase Auth
import { onAuthStateChanged, User } from "firebase/auth";
import "./pages.css";

const Profile = () => {
  const [user, setUser] = useState<User | null>(null); // Store current user
  const [fname, setFirstName] = useState<string>("");
  const [mname, setMiddleName] = useState<string>("");
  const [lname, setLastName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Track authenticated user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadUserProfile(currentUser.uid); // Load existing profile if any
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load user profile from Firestore
  const loadUserProfile = async (uid: string) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        setFirstName(data.fname || "");
        setMiddleName(data.mname || "");
        setLastName(data.lname || "");
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  // Save user profile under their UID
  const handleSubmit = async () => {
    if (!user) {
      alert("You must be logged in to update your profile.");
      return;
    }

    if (!fname || !mname || !lname) {
      alert("Please fill in all fields before saving.");
      return;
    }

    setLoading(true);

    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { fname, mname, lname }, { merge: true });

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile information:", error);
      alert("Error saving profile information. Please try again.");
    } finally {
      setLoading(false);
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
                <li><a href="#">Personal Information</a></li>
                <li><i className="bx bx-chevron-right"></i></li>
                <li><a className="active" href="/">Home</a></li>
              </ul>
            </div>
          </div>

          <div className="table-data">
            <div className="order">
              <div className="head">
                <h3>Information</h3>
              </div>

              <div className="input-container">
                <div className="input-box">
                  <label>First Name:</label>
                  <input 
                    type="text" 
                    placeholder="Enter first name" 
                    value={fname} 
                    onChange={(e) => setFirstName(e.target.value)} 
                  />
                </div>

                <div className="input-box">
                  <label>Middle Name:</label>
                  <input 
                    type="text" 
                    placeholder="Enter middle name" 
                    value={mname} 
                    onChange={(e) => setMiddleName(e.target.value)} 
                  />
                </div>

                <div className="input-box">
                  <label>Last Name:</label>
                  <input 
                    type="text" 
                    placeholder="Enter last name"
                    value={lname} 
                    onChange={(e) => setLastName(e.target.value)} 
                  />
                </div>
              </div>

              <button className="btn-send" onClick={handleSubmit} disabled={loading}>
                <i className="bx bxs-send bx-tada-hover"></i>
                <span className="text">{loading ? "Saving..." : "Save Profile"}</span>
              </button>
              
            </div>
          </div>
        </main>
      </section>
    </div>
  );
};

export default Profile;
