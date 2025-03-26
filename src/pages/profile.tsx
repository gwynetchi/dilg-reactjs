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
  const [alert, setAlert] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

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
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const listenToUserProfile = (uid: string) => {
    const userDocRef = doc(db, "users", uid);

    return onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFirstName(data.fname || "");
          setMiddleName(data.mname || "");
          setLastName(data.lname || "");
        }
      },
      (error) => {
        console.error("Error fetching real-time updates:", error);
      }
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      showAlert("You must be logged in to update your profile", "danger");
      return;
    }

    if (!fname.trim() || !lname.trim()) {
      showAlert("First and Last names are required", "warning");
      return;
    }

    setLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { fname, mname: mname || "", lname }, { merge: true });

      showAlert("Profile Updated Successfully!", "success");
    } catch (error) {
      console.error("Error Saving Profile Information:", error);
      showAlert(`Error: ${(error as any).message || "Could not save profile. Please try again!"}`, "danger");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message: string, type: string) => {
    setAlert({ message, type });

    setTimeout(() => setAlert(null), 5000); // Hide after 5 seconds
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return "✔️";
      case "danger":
        return "❌";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
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
                <li>
                  <a className="active" href={`/profile/${user?.uid}`}>Profile</a>
                </li>
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
                </div>

                <div className="container">
                  <div className="row">
                    {/* First Name */}
                    <div className="col-md-4 mb-2">
                      <label className="form-label">First Name:</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Enter first name"
                        value={fname}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={loading}
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
                        disabled={loading}
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
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm w-50"
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
