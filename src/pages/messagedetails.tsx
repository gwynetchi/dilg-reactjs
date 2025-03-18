import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const MessageDetails: React.FC = () => {
  const { id } = useParams();
  const [message, setMessage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

          setMessage({
            ...msgData,
            senderName,
          });
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
  }, [id]);

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
          </div>
        </main>
      </section>
    </div>
  );
};

export default MessageDetails;
