import { useState, useEffect } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import "../styles/components/dashboard.css";

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [fname, setFirstName] = useState<string>("");
  const [mname, setMiddleName] = useState<string>("");
  const [lname, setLastName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};
  
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        unsubscribeProfile = listenToUserProfile(currentUser.uid);
      } else {
        setUser(null);
      }
    });
  
    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

  const listenToUserProfile = (uid: string) => {
    const userDocRef = doc(db, "users", uid);

    const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFirstName(data.fname || "");
        setMiddleName(data.mname || "");
        setLastName(data.lname || "");
      }
    }, (error) => {
      console.error("Error fetching real-time updates:", error);
    });

    return () => unsubscribeProfile();
  };

  const handleSubmit = async () => {
    if (!user) {
      alert("You must be logged in to update your profile.");
      return;
    }
  
    if (!fname.trim() || !lname.trim()) {
      alert("First and Last names are required.");
      return;
    }
  
    setLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { fname, mname: mname || "", lname }, { merge: true });
  
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile information:", error);
      alert(`Error: ${(error as any).message || "Could not save profile. Please try again."}`);
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
                <li><a className="active" href="/Dashboards">Home</a></li>
                <li><i className="bx bx-chevron-right"></i></li>
                <li><a className="active" href={`/profile/${user?.uid}`}>Profile</a></li>
              </ul>
            </div>
          </div>

          <div className="table-data">
            <div className="order">
              <div className="head">
                <h3>Information</h3>
              </div>

              <div className="container">
                <div className="mb-2">
                  <label className="form-label">First Name:</label>
                  <input 
                    type="text" 
                    className="form-control form-control-sm w-50"  // Smaller input
                    placeholder="Enter first name" 
                    value={fname} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    disabled={loading}
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Middle Name:</label>
                  <input 
                    type="text" 
                    className="form-control form-control-sm w-50"  // Smaller input
                    placeholder="Enter middle name" 
                    value={mname} 
                    onChange={(e) => setMiddleName(e.target.value)} 
                    disabled={loading}
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Last Name:</label>
                  <input 
                    type="text" 
                    className="form-control form-control-sm w-50"  // Smaller input
                    placeholder="Enter last name"
                    value={lname} 
                    onChange={(e) => setLastName(e.target.value)} 
                    disabled={loading}
                  />
                </div>

                <button 
                  className="btn btn-primary btn-sm w-50"  // Smaller button
                  onClick={handleSubmit} 
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Profile"}
                </button>
              </div>

            </div>
          </div>
        </main>    
      </section>
    </div>
  );
};

export default Profile;
