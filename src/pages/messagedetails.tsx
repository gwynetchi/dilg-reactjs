import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth, User } from "firebase/auth";
import { db } from "../firebase";

const MessageDetails: React.FC = () => {
  const { id } = useParams();
  
  const auth = getAuth();
  const currentUser: User | null = auth.currentUser; // Ensure proper type safety
  
  const [role, setRole] = useState<string | null>(null);
  const [message, setMessage] = useState<any>(null);
  const [submissionStatus, setSubmissionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [remark, setRemark] = useState<string | null>(null); // State for storing the added remark
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

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
              const submissionData = submissionSnap.data();
              setSubmissionStatus(submissionData);
              // Fetch the remark from the submission data and set it
              setRemark(submissionData.remark || null); // Set the remark
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
      const submissionId = `${id}_${currentUser.uid}`;
      const submissionRef = doc(db, "submittedDetails", submissionId);
  
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
  
      // ✅ Update the "communications" collection to store the submission ID
      const messageRef = doc(db, "communications", id);
      await updateDoc(messageRef, { 
        submitID: arrayUnion(submissionId) // ✅ Append the submissionId to the submitID array
      });
  
      // Fetch the updated submission status
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

  const processLink = (url: string) => {
    if (!url.trim()) {
      setIframeSrc(null);
      return;
    }

    let modifiedLink = "";

    if (url.includes("docs.google.com/spreadsheets")) {
      modifiedLink = url.replace("/edit", "/preview");
    } else if (url.includes("docs.google.com/document")) {
      modifiedLink = url.replace("/edit", "/preview");
    } else if (url.includes("docs.google.com/forms")) {
      modifiedLink = url;
    } else if (url.includes("drive.google.com/file")) {
      modifiedLink = url.replace("/view", "/preview");
    } else if (url.includes("drive.google.com/drive/folders")) {
      modifiedLink = url;
    } else {
      modifiedLink = "";
    }

    setIframeSrc(modifiedLink);
  };

  // Show modal with the iframe
  const openPreviewModal = (link: string) => {
    processLink(link);
    if (iframeSrc) {
      setShowModal(true);
    }
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setIframeSrc(null); // Clear iframe source when modal closes
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
              <h2>Message Details</h2>
              <br />
              <ul className="breadcrumb">
                <li><Link to="#" className="active">Home</Link></li>
                <li><i className="bx bx-chevron-right"></i></li>
                <li><Link to={inboxPath} className="active">Inbox</Link></li>
                <li><i className="bx bx-chevron-right"></i></li>
                <li><Link to="#">Message Details</Link></li>
              </ul>
            </div>
          </div>

          <div className="message-details-container">
            <h2><strong>Subject:</strong> {message.subject}</h2>
            <p><strong>From:</strong> {message.senderName}</p>
            <p><strong>Sent:</strong> {message.createdAt?.seconds ? new Date(message.createdAt.seconds * 1000).toLocaleString() : "Unknown"}</p>
            <p><strong>Content:</strong> {message.remarks || "No remarks/comments available"}</p>
            <p><strong>Additional Remarks:</strong> {remark || "No additional remarks available"}</p>
            {message.link && (
              <div>
                <strong>Link:</strong> <a href={message.link} target="_blank" rel="noopener noreferrer">{message.link}</a>
                <br></br>
                <button onClick={() => openPreviewModal(message.link)} className="btn-preview">
                  Preview
                </button>
              </div>
            )}     
                  <br />
            <p><strong>Deadline:</strong> {message.deadline?.seconds ? new Date(message.deadline.seconds * 1000).toLocaleString() : "No deadline specified"}</p>

      
            {submissionStatus ? (
              <p><strong>Status:</strong> {submissionStatus.status} on {new Date(submissionStatus.submittedAt?.seconds * 1000).toLocaleString()}</p>
            ) : (
              message.recipients?.includes(currentUser?.uid) && (
                <button onClick={handleMarkAsSubmitted} className="btn-submit bx bx-check btn btn-success btn-md w-20">
                  Mark Submitted/Acknowledged
                </button>
              )
            )}

            <br/>
            <p><strong>Additional Remarks:</strong> <span className="additional-remarks">{submissionStatus?.remark || "No additional remarks available"}</span></p>

        
          </div>
        </main>
      </section>

      {/* Modal for Google Docs/Sheets Preview */}
      {showModal && (
        <div className="overlay">
          <div className="modal-container">
            <button onClick={closeModal} className="close-modal-btn">X</button>
            <div className="container">
              {iframeSrc && (
                <iframe
                  width="1000px"
                  height="700px"
                  src={iframeSrc}
                  frameBorder="0"
                  title="Google Docs Preview"
                ></iframe>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageDetails;
