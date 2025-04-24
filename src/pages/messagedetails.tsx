import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth, User } from "firebase/auth";
import { db } from "../firebase";

const MessageDetails: React.FC = () => {
  const { id } = useParams();
  
  const auth = getAuth();
  const currentUser: User | null = auth.currentUser; // Ensure proper type safety
  const [imageUrl, setImageUrl] = useState<string | null>(null);
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
        
          // 👇 NEW: Set imageUrl from communications document
          setImageUrl(msgData.imageUrl || null);
        
          if (currentUser) {
            const submissionRef = doc(db, "submittedDetails", `${id}_${currentUser.uid}`);
            const submissionSnap = await getDoc(submissionRef);
            if (submissionSnap.exists()) {
              const submissionData = submissionSnap.data();
              setSubmissionStatus(submissionData);
              setRemark(submissionData.remark || null); // Set the remark
            }
          }
        }
        else {
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
        imageUrl: imageUrl, // Use the existing state variable for the uploaded image URL
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
              <h2 className="mb-3">Message Details</h2>
              
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
            <form className="mx-3">
              {/* Deadline */}
              <div className="form-group row justify-content-end mb-4">
                <label className="col-auto col-form-label fw-bold">Deadline:</label>
                <div className="col-auto">
                  <input
                    type="text"
                    className="form-control fw-bold text-center"
                    readOnly
                    style={{
                      backgroundColor: "#f28b82", // soft red (you can tweak this)
                      color: "white",
                      border: "none",
                    }}
                    value={
                      message.deadline?.seconds
                        ? (() => {
                            const date = new Date(message.deadline.seconds * 1000);
                            const options: Intl.DateTimeFormatOptions = {
                              month: "long",
                              day: "2-digit",
                              year: "numeric",
                            };
                            const datePart = new Intl.DateTimeFormat("en-US", options).format(date);
                            const timePart = date.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            });
                            return `${datePart} ${timePart}`;
                          })()
                        : "No deadline specified"
                    }
                  />
                </div>
              </div>
              {/* Sent date & time */}
              <div className="form-group row mb-2">
                    <label className="col-sm-1 col-form-label fw-bold">Sent:</label>
                    <div className="col-sm-11 form-control-plaintext fw-bold">
                      {message.createdAt?.seconds
                        ? (() => {
                            const created = new Date(message.createdAt.seconds * 1000);
                            const date = created.toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            });
                            const time = created.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            });
                            return `${date} ${time}`;
                          })()
                        : "Unknown"}
                    </div>
              </div>
              {/* from */}
              <div className="form-group row mb-2">
                <label className="col-sm-2 col-form-label fw-bold">From:</label>
                <div className="col-sm-10">
                  <input
                      type="text"
                      className="form-control"
                      readOnly
                      value= {message.senderName}
                    />
                </div>
              </div>
              {/* subject */}
              <div className="form-group row mb-4">
                <label className="col-sm-2 col-form-label fw-bold">Subject:</label>
                <div className="col-sm-10">
                  <input
                      type="text"
                      className="form-control"
                      readOnly
                      value= {message.subject}
                    />
                </div>
              </div>
              {/* links and submitted image */}
              <div className="form-group row mb-4">
                <div className="col-sm-7 col-form-label fw-bold px-0">
                  {/* submission link */}
                  <label className="col-sm-7 col-form-label fw-bold">Submission Link:</label>
                  <div className="col-sm-12">
                    {message.submissionLink ? (
                      <div className="form-control" style={{ overflowY: "auto" }}>
                        <a
                          href={message.submissionLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="d-block text-break"
                        >
                          {message.submissionLink}
                        </a>
                        {/* Optional: Preview button */}
                        {/*
                        <button
                          onClick={() => openPreviewModal(message.submissionLink)}
                          className="btn btn-sm btn-outline-primary mt-2"
                        >
                          Preview
                        </button>
                        */}
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="form-control text-muted"
                        readOnly
                        value="No submission link provided."
                      />
                    )}
                  </div>
                  {/* monitoring link */}
                  <label className="col-sm-7 col-form-label fw-bold">Monitoring Link:</label>
                  <div className="col-sm-12">
                    {message.monitoringLink ? (
                      <div className="form-control" style={{ overflowY: "auto" }}>
                        <a
                          href={message.monitoringLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="d-block text-break"
                        >
                          {message.monitoringLink}
                        </a>
                        {/* Optional preview button */}
                        {/*
                        <button
                          onClick={() => openPreviewModal(message.monitoringLink)}
                          className="btn btn-sm btn-outline-primary mt-2"
                        >
                          Preview
                        </button>
                        */}
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="form-control text-muted"
                        readOnly
                        value="No monitoring link provided."
                      />
                    )}
                  </div>

                </div>
                <div className="col-sm-5 col-form-label fw-bold px-0">
                  <label className="col-sm-10 col-form-label fw-bold">Submitted Image:</label>
                  
                  {imageUrl ? (
                    <div className="col-sm-12">
                      <img
                        src={imageUrl}
                        alt="Submitted"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "400px",
                          borderRadius: "10px",
                          marginTop: "0px",
                        }}
                      />
                    </div>
                  ) : (
                    <div className="col-sm-12 text-muted" style={{ marginTop: "10px" }}>
                      No image submitted.
                    </div>
                  )}
                </div>

              </div>
              {/* Comments (called content before) */}
              <div className="form-group row mb-2">
                  <label className="col-sm-2 col-form-label fw-bold">Comment:</label>
                  <div className="col-sm-10">
                    <input
                        type="text"
                        className="form-control"
                        readOnly
                        value= {message.remarks || "No remarks/comments available"}
                      />
                  </div>
              </div>
              {/* remarks */}
              <div className="form-group row mb-2">
                  <label className="col-sm-2 col-form-label fw-bold">Remarks:</label>
                  <div className="col-sm-10">
                    <input
                        type="text"
                        className="form-control"
                        readOnly
                        value= {submissionStatus?. remark || "No additional remarks available"}
                      />
                  </div>
              </div>
              {/* Sent and status button */}
              <div className="form-group row mb-2">
                <div className=" align-items-center px-3 mt-5">
                  {/* Right side: Submission status */}
                  <div className="text-center">
                    {submissionStatus ? (
                      <p className="form-control-plaintext mb-0">
                        <span className="fw-bold text-success">
                          {submissionStatus.status} on{" "}
                          {new Date(submissionStatus.submittedAt?.seconds * 1000).toLocaleString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </p>
                    ) : (
                      message.recipients?.includes(currentUser?.uid) && (
                        <button
                          onClick={handleMarkAsSubmitted}
                          className="btn btn-success btn-md mt-1"
                        >
                          <i className="bx bx-check me-1"></i>
                          Mark as Submitted / Acknowledged
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </form>
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
