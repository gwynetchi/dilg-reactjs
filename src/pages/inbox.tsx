import React, { useState, useEffect } from "react";
import { collection, query, where, doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

const Inbox: React.FC = () => {
  interface Communication {
    id: string;
    createdBy: string;
    subject?: string;
    createdAt?: {
      seconds: number;
    };
  }
  
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [senderNames, setSenderNames] = useState<{ [key: string]: string }>({}); // Store sender names
  const navigate = useNavigate();

  // Track authenticated user and fetch role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const userRef = doc(db, "users", user.uid);
        onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            setUserRole(userSnap.data().role);
          }
        });
      } else {
        setUserId(null);
        setUserRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch messages in real-time
  useEffect(() => {
    if (!userId) return;

    const commRef = collection(db, "communications");
    const q = query(commRef, where("recipient", "==", userId));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      setLoading(true);
      const messages = querySnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          createdBy: data.createdBy,
          subject: data.subject,
          createdAt: data.createdAt,
        };
      });

      setCommunications(messages);
      setLoading(false);

      // Fetch sender names in real-time
      messages.forEach((msg) => {
        if (msg.createdBy && !senderNames[msg.createdBy]) {
          listenToSenderProfile(msg.createdBy);
        }
      });
    });

    return () => unsubscribe();
  }, [userId]);

  // Listen for sender name updates in real-time
  const listenToSenderProfile = (senderId: string) => {
    const senderRef = doc(db, "users", senderId);
    const unsubscribeSender = onSnapshot(senderRef, (senderSnap) => {
      if (senderSnap.exists()) {
        const senderData = senderSnap.data();
        const senderName = `${senderData.fname} ${senderData.mname ? senderData.mname + " " : ""}${senderData.lname}`.trim();
        
        // Update senderNames state
        setSenderNames((prev) => ({
          ...prev,
          [senderId]: senderName,
        }));
      }
    });

    return () => unsubscribeSender();
  };

  // Function to open message based on role
  const openMessage = (id: string) => {
    if (!userRole) {
      console.error("User role not found.");
      return;
    }

    const rolePaths: { [key: string]: string } = {
      Evaluator: "evaluator",
      Viewer: "viewer",
      LGU: "lgu",
      Admin: "admin",
    };

    navigate(`/${rolePaths[userRole] || "viewer"}/communication/${id}`);
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
                          <td>{senderNames[msg.createdBy] || "Loading..."}</td>
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
