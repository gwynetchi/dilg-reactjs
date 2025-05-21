import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const ProgramMessageDetails: React.FC = () => {
  const { id } = useParams();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [role, setRole] = useState<string | null>(null);
  const [message, setMessage] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<any>(null);
  const [remark, setRemark] = useState<string | null>(null);
  const [evaluatorRemark, setEvaluatorRemark] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const fetchRole = async () => {
      const userRef = doc(db, "users", currentUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setRole(snap.data().role);
      }
    };
    fetchRole();
  }, [currentUser]);

  useEffect(() => {
    if (!id || !currentUser) return;

    const fetchMessageDetails = async () => {
      setLoading(true);
      try {
        const msgRef = doc(db, "programcommunications", id);
        const msgSnap = await getDoc(msgRef);
        if (msgSnap.exists()) {
          const msgData = msgSnap.data();
          let senderName = "Unknown";

          if (msgData.createdBy) {
            const senderRef = doc(db, "users", msgData.createdBy);
            const senderSnap = await getDoc(senderRef);
            if (senderSnap.exists()) {
              const senderData = senderSnap.data();
              senderName = `${senderData.fname} ${senderData.mname || ""} ${senderData.lname}`.trim();
            }
          }

          setMessage({ ...msgData, senderName });
          setImageUrl(msgData.imageUrl || null);

          // Only fetch submission details if user is not a Viewer
          if (role !== "Viewer" || "viewer") {
            const subRef = doc(db, "submittedDetails", `${id}_${currentUser.uid}`);
            const subSnap = await getDoc(subRef);
            if (subSnap.exists()) {
              const subData = subSnap.data();
              setSubmissionStatus(subData);
              setRemark(subData.remark || null);
              setEvaluatorRemark(subData.evaluatorRemark || null);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching message:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessageDetails();
  }, [id, currentUser, role]); // Added role to dependencies

  const handleMarkAsSubmitted = async () => {
    if (!currentUser || !message || !id) return;

    try {
      const submissionId = `${id}_${currentUser.uid}`;
      const submissionRef = doc(db, "submittedDetails", submissionId);

      let autoStatus = "On Time";
      if (message.deadline?.seconds) {
        const deadlineDate = new Date(message.deadline.seconds * 1000);
        const now = new Date();
        if (now > deadlineDate) autoStatus = "Late";
      }

      await setDoc(submissionRef, {
        messageId: id,
        submittedBy: currentUser.uid,
        status: "Submitted",
        submittedAt: serverTimestamp(),
        autoStatus,
        imageUrl,
        evaluatorStatus: "Pending",
      }, { merge: true });

      const msgRef = doc(db, "programcommunications", id);
      await updateDoc(msgRef, {
        submitID: arrayUnion(submissionId),
      });

      const updatedSnap = await getDoc(submissionRef);
      if (updatedSnap.exists()) {
        setSubmissionStatus(updatedSnap.data());
      }

      alert(`Marked as Submitted! Status: ${autoStatus}`);
    } catch (err) {
      console.error("Error submitting:", err);
      alert("Submission failed.");
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

  const formatDate = (seconds: number) => {
    const date = new Date(seconds * 1000);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const inboxPath = role ? `/${role.toLowerCase()}/program-inbox` : "/";

  if (loading) return <div>Loading...</div>;
  if (!message) return <p>Message not found.</p>;

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h2>Program Message Details</h2>
              <ul className="breadcrumb">
                <li><Link to="/">Home</Link></li>
                <li><i className="bx bx-chevron-right"></i></li>
                <li><Link to={inboxPath}>Program Inbox</Link></li>
                <li><i className="bx bx-chevron-right"></i></li>
                <li><span>Message Details</span></li>
              </ul>
            </div>
          </div>

          <div className="message-details-container p-3">
            <div className="mb-3">
              <strong>From:</strong> {message.senderName}
            </div>
            <div className="mb-3">
              <strong>Subject:</strong> {message.subject}
            </div>
            <div className="mb-3">
              <strong>Deadline:</strong> {message.deadline?.seconds ? formatDate(message.deadline.seconds) : "None"}
            </div>
            <div className="mb-3">
              <strong>Message:</strong> <p>{message.body}</p>
            </div>
            {imageUrl && (
              <div className="mb-3">
                <button className="btn btn-primary" onClick={() => openPreviewModal(imageUrl)}>
                  Preview Attachment
                </button>
              </div>
            )}

            {/* Only show submission-related elements if user is not a Viewer */}
            {(role !== "Viewer" && role !== "viewer") && (
              <>
                {submissionStatus ? (
                  <>
                    <div className="alert alert-info">You already submitted this message.</div>
                    <div><strong>Evaluator Status:</strong> {submissionStatus.evaluatorStatus}</div>
                    {remark && <div><strong>Your Remark:</strong> {remark}</div>}
                    {evaluatorRemark && <div><strong>Evaluator Remark:</strong> {evaluatorRemark}</div>}
                  </>
                ) : (
                  <button className="btn btn-success" onClick={handleMarkAsSubmitted}>
                    Mark as Submitted
                  </button>
                )}
              </>
            )}
          </div>

          {showModal && (
            <div className="modal show d-block" tabIndex={-1} onClick={closeModal}>
              <div className="modal-dialog modal-xl" onClick={e => e.stopPropagation()}>
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Attachment Preview</h5>
                    <button type="button" className="btn-close" onClick={closeModal}></button>
                  </div>
                  <div className="modal-body">
                    <iframe src={iframeSrc!} width="100%" height="500px" title="Preview" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </section>
    </div>
  );
};

export default ProgramMessageDetails;