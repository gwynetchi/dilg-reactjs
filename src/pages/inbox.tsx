import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

const Inbox: React.FC = () => {
  const [communications, setCommunications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // Move inside component
  const navigate = useNavigate();

  // Track authenticated user and fetch role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        
        // Fetch user role from Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserRole(userSnap.data().role); // Ensure Firestore contains "role"
        }
      } else {
        setUserId(null);
        setUserRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch user messages
  useEffect(() => {
    if (!userId) return;

    const fetchCommunications = async () => {
      setLoading(true);
      try {
        const commRef = collection(db, "communications");
        const q = query(commRef, where("recipient", "==", userId));
        const querySnapshot = await getDocs(q);

        const messages = await Promise.all(
          querySnapshot.docs.map(async (docSnapshot) => {
            const msgData = docSnapshot.data();
            let senderName = "Unknown";

            if (msgData.createdBy) {
              const senderRef = doc(db, "users", msgData.createdBy);
              const senderSnap = await getDoc(senderRef);
              if (senderSnap.exists()) {
                const senderData = senderSnap.data();
                senderName = `${senderData.fname} ${senderData.mname ? senderData.mname + " " : ""}${senderData.lname}`.trim();
              }
            }

            return {
              id: docSnapshot.id,
              ...msgData,
              senderName,
            };
          })
        );

        setCommunications(messages);
      } catch (error) {
        console.error("Error fetching communications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunications();
  }, [userId]);

  // Function to open message based on role
  const openMessage = (id: string) => {
    if (!userRole) {
      console.error("User role not found.");
      return;
    }

    // Define role-based routes
    const rolePaths: { [key: string]: string } = {
      Evaluator: "evaluator",
      Viewer: "viewer",
      LGU: "lgu",
      Admin: "admin",
    };

    const rolePath = rolePaths[userRole] || "viewer"; // Default to "viewer" if role is unknown
    navigate(`/${rolePath}/communication/${id}`);
  };

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h1>Communication</h1>
              <ul className="breadcrumb">
                <li>
                  <Link to="#">LGU Field Officers Communication</Link>
                </li>
                <li>
                  <i className="bx bx-chevron-right"></i>
                </li>
                <li>
                  <Link to="#" className="active">Home</Link>
                </li>
              </ul>
            </div>
            <button className="btn-download">
              <i className="bx bxs-cloud-download bx-fade-down-hover"></i>
              <span className="text">PDF Export</span>
            </button>
          </div>

          <div className="table-data">
            <div className="order">
              <div className="head">
                <h3>Announcements</h3>
                <i className="bx bx-search"></i>
                <i className="bx bx-filter"></i>
              </div>

              <div className="inbox-container">
                <h2>Inbox</h2>
                {loading ? (
                  <p>Loading messages...</p>
                ) : communications.length === 0 ? (
                  <p>No messages found.</p>
                ) : (
                  <table className="inbox-table">
                    <thead>
                      <tr>
                        <th>Sender</th>
                        <th>Subject</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {communications.map((msg) => (
                        <tr
                          key={msg.id}
                          onClick={() => openMessage(msg.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>{msg.senderName}</td>
                          <td>{msg.subject}</td>
                          <td>
                            {msg.createdAt
                              ? new Date(msg.createdAt.seconds * 1000).toLocaleString()
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </main>
      </section>
    </div>
  );
};

export default Inbox;
