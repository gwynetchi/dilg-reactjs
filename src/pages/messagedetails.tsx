import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth, User } from "firebase/auth";
import { db } from "../firebase";

const MessageDetails: React.FC = () => {
  const { id } = useParams();
  
  const auth = getAuth();
  const currentUser: User | null = auth.currentUser;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [message, setMessage] = useState<any>(null);
  const [submissionStatus, setSubmissionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [remark, setRemark] = useState<string | null>(null);
  const [evaluatorRemark, setEvaluatorRemark] = useState<string | null>(null);
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
          setImageUrl(msgData.imageUrl || null);
  
          if (currentUser) {
            const submissionRef = doc(db, "submittedDetails", `${id}_${currentUser.uid}`);
            const submissionSnap = await getDoc(submissionRef);
            if (submissionSnap.exists()) {
              const submissionData = submissionSnap.data();
              setSubmissionStatus(submissionData);
              setRemark(submissionData.remark || null);
              setEvaluatorRemark(submissionData.evaluatorRemark || null);
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
  
      let autoStatus = "On Time";
      if (message.deadline?.seconds) {
        const deadlineDate = new Date(message.deadline.seconds * 1000);
        const now = new Date();
        if (now > deadlineDate) {
          autoStatus = "Late";
        }
      }
  
      await setDoc(submissionRef, {
        messageId: id,
        submittedBy: currentUser.uid,
        status: "Submitted",
        submittedAt: serverTimestamp(),
        autoStatus,
        imageUrl: imageUrl,
        evaluatorStatus: "Pending",
      }, { merge: true });
  
      const messageRef = doc(db, "communications", id);
      await updateDoc(messageRef, { 
        submitID: arrayUnion(submissionId)
      });
  
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

  const openPreviewModal = (url: string) => {
    setIframeSrc(url);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIframeSrc(null);
  };

  if (loading) return (
    <div className="spinner-overlay">
      <div className="spinner"></div>
    </div>
  );
  if (!message) return <p>Message not found.</p>;

  const inboxPath = role ? `/${role.toLowerCase()}/inbox` : "/";
  
  const formatDate = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const datePart = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const timePart = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart} ${timePart}`;
  };

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h2 className="mb-2">Message Details</h2>
              
              <ul className="breadcrumb mb-0">
                <li><Link to="#" className="active">Home</Link></li>
                <li><i className="bx bx-chevron-right"></i></li>
                <li><Link to={inboxPath} className="active">Inbox</Link></li>
                <li><i className="bx bx-chevron-right"></i></li>
                <li><Link to="#">Message Details</Link></li>
              </ul>
            </div>
          </div>

          <div className="message-details-container">
            <div className="row mx-1 mb-3">
              {/* Header with Deadline and Status */}
              <div className="col-12 d-flex justify-content-between align-items-center mb-2">
                <div className="d-flex align-items-center">
                  <span className="fw-bold me-2">From:</span>
                  <span>{message.senderName}</span>
                </div>
                <div>
                  <span className="badge bg-danger px-3 py-2">
                    Deadline: {message.deadline?.seconds ? formatDate(message.deadline.seconds) : "No deadline"}
                  </span>
                </div>
              </div>
              
              <div className="col-12 d-flex justify-content-between align-items-center mb-3">
                <div>
                  <span className="fw-bold me-2">Subject:</span>
                  <span className="fw-semibold">{message.subject}</span>
                </div>
                <div>
                  <span className="text-muted">
                    Sent: {message.createdAt?.seconds ? formatDate(message.createdAt.seconds) : "Unknown"}
                  </span>
                </div>
              </div>
            </div>

            <div className="row mx-1">
              {/* Left Side: Links and Info */}
              <div className="col-md-7 pe-md-4">
                {/* Links Section */}
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">Links</h5>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="form-label fw-bold">Submission Link:</label>
                      {message.submissionLink ? (
                        <div className="d-flex align-items-center">
                          <div className="form-control flex-grow-1 me-2" style={{ overflowX: "auto" }}>
                            <a
                              href={message.submissionLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-break"
                            >
                              {message.submissionLink}
                            </a>
                          </div>
                          <button
                            onClick={() => openPreviewModal(message.submissionLink)}
                            className="btn btn-sm btn-outline-primary"
                          >
                            Preview
                          </button>
                        </div>
                      ) : (
                        <p className="text-muted mb-0">No submission link provided.</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="form-label fw-bold">Monitoring Link:</label>
                      {message.monitoringLink ? (
                        <div className="d-flex align-items-center">
                          <div className="form-control flex-grow-1 me-2" style={{ overflowX: "auto" }}>
                            <a
                              href={message.monitoringLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-break"
                            >
                              {message.monitoringLink}
                            </a>
                          </div>
                          <button
                            onClick={() => openPreviewModal(message.monitoringLink)}
                            className="btn btn-sm btn-outline-primary"
                          >
                            Preview
                          </button>
                        </div>
                      ) : (
                        <p className="text-muted mb-0">No monitoring link provided.</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Remarks Section */}
                <div className="card">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">Remarks</h5>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="form-label fw-bold">Evaluator's Remarks:</label>
                      <p className="form-control-plaintext border p-2 rounded bg-light">
                        {evaluatorRemark || "No evaluator remarks yet"}
                      </p>
                    </div>
                    
                    <div>
                      <label className="form-label fw-bold">Your Remarks:</label>
                      <p className="form-control-plaintext border p-2 rounded bg-light">
                        {remark || "No additional remarks available"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Side: Image and Submission */}
              <div className="col-md-5">
                <div className="card h-100">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">Submission</h5>
                  </div>
                  <div className="card-body d-flex flex-column">
                    <div className="mb-3 flex-grow-1 text-center">
                      <label className="form-label fw-bold mb-2">Submitted Image:</label>
                      <div className="image-container" style={{ minHeight: "200px" }}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt="Submitted"
                            style={{
                              maxWidth: "100%",
                              maxHeight: "300px",
                              borderRadius: "8px",
                              objectFit: "contain"
                            }}
                          />
                        ) : (
                          <div className="text-muted d-flex align-items-center justify-content-center h-100">
                            <i className="bx bx-image me-2"></i> No image submitted
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="submission-status text-center mt-auto">
                      {submissionStatus ? (
                        <div className="alert alert-success mb-0">
                          <i className="bx bx-check-circle me-2"></i>
                          <span className="fw-bold">
                            {submissionStatus.status} on{" "}
                            {formatDate(submissionStatus.submittedAt?.seconds)}
                          </span>
                        </div>
                      ) : (
                        message.recipients?.includes(currentUser?.uid) && (
                          <button
                            onClick={handleMarkAsSubmitted}
                            className="btn btn-success btn-lg w-100"
                          >
                            <i className="bx bx-check me-2"></i>
                            Mark as Submitted / Acknowledged
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </section>

      {/* Modal for Preview */}
      {showModal && (
        <div className="modal-backdrop" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1050
        }}>
          <div className="modal-content" style={{
            width: "90%",
            height: "90%",
            backgroundColor: "#fff",
            borderRadius: "8px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            <div className="modal-header d-flex justify-content-between align-items-center p-3 bg-light">
              <h5 className="mb-0">Document Preview</h5>
              <button onClick={closeModal} className="btn-close"></button>
            </div>
            <div className="modal-body p-0" style={{ flexGrow: 1 }}>
              {iframeSrc && (
                <iframe
                  width="100%"
                  height="100%"
                  src={iframeSrc}
                  frameBorder="0"
                  title="Preview"
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