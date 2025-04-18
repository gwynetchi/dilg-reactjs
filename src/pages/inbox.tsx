import React, { useState, useEffect } from "react";
import { collection, query, where, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";

const Inbox: React.FC = () => {
  interface Communication {
    imageUrl: any;
    recipients: string[];
    seenBy: any;
    id: string;
    createdBy: string;
    subject?: string;
    createdAt?: {
      seconds: number;
      nanoseconds?: number; // Optional for Firestore compatibility
    } | null;
  }

  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [senderNames, setSenderNames] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<{ id: string; recipients: string[] } | null>(null);

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
    const q = query(commRef, where("recipients", "array-contains", userId));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      setLoading(true);
      const messages = querySnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          createdBy: data.createdBy,
          recipients: data.recipients as string[], // Explicitly type recipients as string[]
          createdAt: data.createdAt || serverTimestamp(), // Ensure timestamp exists
          seenBy: data.seenBy || [], // Add default empty array for seenBy
          subject: data.subject || "No Subject", // Make sure subject is included, default to "No Subject" if missing
          imageUrl: data.imageUrl || "", // ✅ include this
        };
      });

      setCommunications(messages);
      setLoading(false);

      // Fetch sender names in real-time (limit to unique senders)
      const uniqueSenders = Array.from(new Set(messages.map((msg) => msg.createdBy)));
      uniqueSenders.forEach((senderId) => {
        if (!senderNames[senderId]) {
          listenToSenderProfile(senderId);
        }
      });
    });

    return () => unsubscribe();
  }, [userId]);

  // Function to delete a message
  const deleteMessage = async () => {
    if (!selectedMessage) return;
    const { id, recipients } = selectedMessage;
  
    try {
      const updatedRecipients = recipients.filter((recipient) => recipient !== userId);
  
      if (updatedRecipients.length === 0) {
        await deleteDoc(doc(db, "communications", id));
        console.log("Message deleted successfully!");
      } else {
        await updateDoc(doc(db, "communications", id), {
          recipients: updatedRecipients,
        });
        console.log("Message removed for this user.");
      }
  
      setCommunications((prev) => prev.filter((msg) => msg.id !== id || updatedRecipients.length > 0));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  
    setShowModal(false);
  };  
  
  // Listen for sender name updates in real-time
  const listenToSenderProfile = (senderId: string) => {
    const senderRef = doc(db, "users", senderId);
    const unsubscribeSender = onSnapshot(senderRef, (senderSnap) => {
      if (senderSnap.exists()) {
        const senderData = senderSnap.data();
        const { fname, mname, lname, email } = senderData;

        // Check if at least one name field is set
        const hasName = fname || mname || lname;
        const senderDisplayName = hasName
          ? `${fname || ""} ${mname ? mname + " " : ""}${lname || ""}`.trim()
          : email || "Unknown Email"; // Use email if name is missing

        // Update senderNames state
        setSenderNames((prev) => ({
          ...prev,
          [senderId]: senderDisplayName,
        }));
      }
    });

    return () => unsubscribeSender();
  };

  // Function to open message based on role
  const openMessage = async (id: string) => {
    if (!userRole || !userId) {
      console.error("User role or ID not found.");
      return;
    }

    const rolePaths: { [key: string]: string } = {
      Evaluator: "evaluator",
      Viewer: "viewer",
      LGU: "lgu",
      Admin: "admin",
    };

    const messageRef = doc(db, "communications", id);

    try {
      await updateDoc(messageRef, {
        seenBy: arrayUnion(userId), // Add the user ID to "seenBy"
      });
    } catch (error) {
      console.error("Error marking message as seen:", error);
    }

    navigate(`/${rolePaths[userRole] || "viewer"}/inbox/${id}`);
  };

  const handleDeleteRequest = (id: string, recipients: string[]) => {
    setSelectedMessage({ id, recipients });
    setShowModal(true);
  };
  

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h1>Inbox</h1>
              <ul className="breadcrumb">
                <li>
                  <a href="/dashboards" className="active">Home</a>
                </li>
                <li>
                  <i className="bx bx-chevron-right"></i>
                </li>
                <li>
                  <a>Inbox</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="table-data">
            <div className="order">
              <div className="inbox-container">
                {loading ? (
                  <p>Loading messages...</p>
                ) : communications.length === 0 ? (
                  <p>No messages found.</p>
                ) : (
                  <table className="inbox-table">
                    <thead>
                      <tr>
                        <th>Attachment</th>
                        <th>Sender</th>
                        <th>Subject</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {communications.map((msg) => (
                        <tr
                          key={msg.id}
                          onClick={() => openMessage(msg.id)}
                          style={{
                            cursor: "pointer",
                            fontWeight: msg.seenBy?.includes(userId) ? "normal" : "bold",
                            backgroundColor: msg.seenBy?.includes(userId) ? "transparent" : "#f5f5f5",
                          }}
                        >
                          <td>
                            {msg.imageUrl ? (
                              <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={msg.imageUrl}
                                  alt="attachment"
                                  style={{ width: "60px", borderRadius: "5px" }}
                                  onClick={(e) => e.stopPropagation()} // prevent triggering row click
                                />
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td>{senderNames[msg.createdBy] || "Loading..."}</td>
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
                              e.stopPropagation(); // Prevent row click event
                              handleDeleteRequest(msg.id, msg.recipients);
                            }}
                          >
                            Delete
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
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>Are you sure you want to delete this message?</p>
            <div className="modal-buttons">
              <button onClick={() => setShowModal(false)} className="cancel-btn">Cancel</button>
              <button onClick={deleteMessage} className="confirm-btn">Confirm</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inbox;
