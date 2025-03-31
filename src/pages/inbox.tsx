import React, { useState, useEffect } from "react";
import { collection, query, where, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import { updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";

const Inbox: React.FC = () => {
  interface Communication {
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
  const deleteMessage = async (id: string, recipients: string[]) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
  
    // Check if the current user is in the recipients list
    if (userId && !recipients.includes(userId)) {
      alert("You can't delete a message that wasn't sent to you.");
      return;
    }
  
    try {
      // Remove the current user from the recipients array
      const updatedRecipients = recipients.filter((recipient) => recipient !== userId);
  
      if (updatedRecipients.length === 0) {
        // If no recipients are left, delete the entire message
        await deleteDoc(doc(db, "communications", id));
        console.log("Message deleted successfully!");
      } else {
        // Otherwise, just update the recipients list
        await updateDoc(doc(db, "communications", id), {
          recipients: updatedRecipients,
        });
        console.log("Message removed for this user.");
      }
  
      // Update the local state
      setCommunications((prev) => prev.filter((msg) => msg.id !== id || updatedRecipients.length > 0));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
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

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h1>Inbox</h1>
              <ul className="breadcrumb">
                <li>
                  <Link to="/dashboards" className="active">Home</Link>
                </li>
                <li>
                  <i className="bx bx-chevron-right"></i>
                </li>
                <li>
                  <Link to="#" className="active">Inbox</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="table-data">
            <div className="order">
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
                            fontWeight: msg.seenBy?.includes(userId) ? "normal" : "bold", // Bold if unread
                            backgroundColor: msg.seenBy?.includes(userId) ? "transparent" : "#f5f5f5", // Highlight unread
                          }}
                        >
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
                                deleteMessage(msg.id, msg.recipients); // Pass recipients array to the delete function
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

export default Inbox;
