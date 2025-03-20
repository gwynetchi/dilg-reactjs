import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";

const MessageDetails: React.FC = () => {
  const { id } = useParams();
  const [message, setMessage] = useState<any>(null);
  const [submissionStatus, setSubmissionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchMessage = async () => {
      if (!id) return;

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

          // Fetch submission status
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
      await setDoc(submissionRef, {
        messageId: id,
        submittedBy: currentUser.uid,
        status: "Submitted",
        submittedAt: serverTimestamp(),
      });

      setSubmissionStatus({ status: "Submitted", submittedAt: new Date() });
      alert("Marked as Submitted!");
    } catch (error) {
      console.error("Error updating submission status:", error);
      alert("Failed to mark as submitted.");
    }
  };

  if (loading) return <p>Loading message details...</p>;
  if (!message) return <p>Message not found.</p>;

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

          <div className="message-details-container">
            <button onClick={() => navigate(-1)} className="back-button">Back</button>
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

            {/* Show submission status */}
            {submissionStatus ? (
              <p><strong>Status:</strong> {submissionStatus.status} on {new Date(submissionStatus.submittedAt?.seconds * 1000).toLocaleString()}</p>
            ) : (
              currentUser?.uid === message.recipient && (
                <button onClick={handleMarkAsSubmitted} className="btn-submit">
                  Mark as Submitted
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
