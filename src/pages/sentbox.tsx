import React, { useState, useEffect } from "react";
import { collection, query, where, doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

const Sentbox: React.FC = () => {
  interface Communication {
    recipients: string[];
    id: string;
    createdBy: string;
    subject?: string;
    createdAt?: {
      seconds: number;
      nanoseconds?: number;
    } | null;
  }

  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const commRef = collection(db, "communications");
    const q = query(commRef, where("createdBy", "==", userId));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setLoading(true);
      const messages = querySnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          createdBy: data.createdBy,
          recipients: data.recipients || [],
          createdAt: data.createdAt || null,
          subject: data.subject || "No Subject",
        };
      });
      setCommunications(messages);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  const deleteMessage = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteDoc(doc(db, "communications", id));
      setCommunications((prev) => prev.filter((msg) => msg.id !== id));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const openMessage = (id: string) => {
    navigate(`/sent/${id}`);
  };

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h1>Sent</h1>
              <ul className="breadcrumb">
                <li>
                  <Link to="/dashboards" className="active">Home</Link>
                </li>
                <li>
                  <i className="bx bx-chevron-right"></i>
                </li>
                <li>
                  <Link to="#" className="active">Sent</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="table-data">
            <div className="order">
              <div className="inbox-container">
                <h2>Sent Messages</h2>
                {loading ? (
                  <p>Loading messages...</p>
                ) : communications.length === 0 ? (
                  <p>No messages found.</p>
                ) : (
                  <table className="inbox-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {communications.map((msg) => (
                        <tr key={msg.id} onClick={() => openMessage(msg.id)} style={{ cursor: "pointer" }}>
                          <td>{msg.subject}</td>
                          <td>
                            {msg.createdAt && typeof msg.createdAt.seconds === "number" ? (
                              new Date(msg.createdAt.seconds * 1000).toLocaleString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: true,
                              })
                            ) : (
                              <span style={{ color: "red" }}>No Timestamp</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMessage(msg.id);
                              }}
                            >
                              🗑️ Delete
                            </button>
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

export default Sentbox;
