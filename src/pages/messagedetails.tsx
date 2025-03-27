import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, User } from "firebase/auth";
import { db } from "../firebase";

const MessageDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const auth = getAuth();
  const currentUser: User | null = auth.currentUser; // Ensure proper type safety
  
  const [role, setRole] = useState<string | null>(null);
  const [message, setMessage] = useState<any>(null);
  const [submissionStatus, setSubmissionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const fetchUserRole = async () => {
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setRole(userSnap.data().role);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };

    fetchUserRole();
  }, [currentUser]);

  useEffect(() => {
    if (!id) return;

    const fetchMessage = async () => {
      setLoading(true);
      try {
        const msgRef = doc(db, "communications", id);
        const msgSnap = await getDoc(msgRef);

        if (msgSnap.exists()) {
          const msgData = msgSnap.data();
          let senderName = "Unknown";

          if (msgData.createdBy) {
            const senderRef = doc(db, "users", msgData.createdBy);
            const senderSnap = await getDoc(senderRef);
            if (senderSnap.exists()) {
              const senderData = senderSnap.data();
              senderName = `${senderData.fname} ${senderData.mname ? senderData.mname + " " : ""}${senderData.lname}`.trim();
            }
          }

          setMessage({ ...msgData, senderName });

          if (currentUser) {
            const submissionRef = doc(db, "submittedDetails", `${id}_${currentUser.uid}`);
            const submissionSnap = await getDoc(submissionRef);
            if (submissionSnap.exists()) {
              setSubmissionStatus(submissionSnap.data());
            }
          }
        } else {
          console.error("Message not found");
        }
      } catch (error) {
        console.error("Error fetching message details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, [id, currentUser]);

  const handleMarkAsSubmitted = async () => {
    if (!message || !id || !currentUser) return;

    try {
      const submissionRef = doc(db, "submittedDetails", `${id}_${currentUser.uid}`);

      let autoStatus = "On Time"; // Default status
      if (message.deadline?.seconds) {
        const deadlineDate = new Date(message.deadline.seconds * 1000);
        const now = new Date();
        if (now > deadlineDate) {
          autoStatus = "Late"; // Mark as Late if past the deadline
        }
      }

      await setDoc(submissionRef, {
        messageId: id,
        submittedBy: currentUser.uid,
        status: "Submitted",
        submittedAt: serverTimestamp(),
        autoStatus,
        evaluatorStatus: "Pending",
      }, { merge: true });

      const updatedSubmissionSnap = await getDoc(submissionRef);
      if (updatedSubmissionSnap.exists()) {
        setSubmissionStatus(updatedSubmissionSnap.data());
      }

      alert(`Marked as Submitted! Status: ${autoStatus}`);
    } catch (error) {
      console.error("Error updating submission status:", error);
      alert("Failed to mark as submitted.");
    }
  };

  if (loading) return <p>Loading message details...</p>;
  if (!message) return <p>Message not found.</p>;

  const inboxPath = role ? `/${role.toLowerCase()}/inbox` : "/";

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h1>Message Details</h1>
              <br></br>
              <ul className="breadcrumb">
                <li><Link to="#" className="active">Home</Link></li>
                <li><i className="bx bx-chevron-right"></i></li>
                <li><Link to={inboxPath} className="active">Inbox</Link></li>
                <li><i className="bx bx-chevron-right"></i></li>
                <li><Link to="#" className="active">Message Details</Link></li>
              </ul>
            </div>
          </div>

          <div className="message-details-container">
            <button onClick={() => navigate(inboxPath)} className="bx bx-arrow-back btn btn-primary btn-sm w-20">
            </button> <br>
            </br>
            <h2>{message.subject}</h2>
            <p><strong>From:</strong> {message.senderName}</p>
            <p><strong>Sent:</strong> {message.createdAt?.seconds ? new Date(message.createdAt.seconds * 1000).toLocaleString() : "Unknown"}</p>
            <p><strong>Remarks:</strong> {message.remarks || "No remarks available"}</p>
            
            {message.link && (
              <p>
                <strong>Link:</strong> <a href={message.link} target="_blank" rel="noopener noreferrer">{message.link}</a>
              </p>
            )}
            
            <p><strong>Deadline:</strong> {message.deadline?.seconds ? new Date(message.deadline.seconds * 1000).toLocaleString() : "No deadline specified"}</p>
            
            <br />
            {submissionStatus ? (
              <p><strong>Status:</strong> {submissionStatus.status} on {new Date(submissionStatus.submittedAt?.seconds * 1000).toLocaleString()}</p>
            ) : (
              message.recipients?.includes(currentUser?.uid) && (
                <button onClick={handleMarkAsSubmitted} className="btn-submit bx bx-check btn btn-success btn-md w-20">
                  Mark Submitted/Acknowledged
                </button>
              )
            )}
          </div>
        </main>
      </section>
    </div>
  );
};

export default MessageDetails;
