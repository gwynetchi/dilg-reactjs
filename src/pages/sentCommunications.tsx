import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const SentCommunications: React.FC = () => {
  const { id } = useParams();
  const [communication, setCommunication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCommunication = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const docRef = doc(db, "communications", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setCommunication(docSnap.data());
        } else {
          setError("Communication not found");
        }
      } catch (error) {
        console.error("Error fetching communication:", error);
        setError("Failed to load communication details");
      } finally {
        setLoading(false);
      }
    };

    fetchCommunication();
  }, [id]);

  const isImage = (url: string) => {
    return /\.(jpeg|jpg|gif|png|webp)$/i.test(url);
  };

  return (
    <div className="dashboard-container">
      <main>
        <div className="head-title">
          <div className="left">
            <h1>Communication Details</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                 <Link to="/">Dashboard</Link>
                </li>
                <li className="breadcrumb-item active">Communication</li>
              </ol>
            </nav>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
            <i className="bx bx-error-circle fs-4"></i>
            <div>{error}</div>
          </div>
        )}

        {loading ? (
          <div className="text-center my-5 py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : communication ? (
          <div className="card">
            <div className="card-body">
            <h5 className="card-title"> {communication.subject}</h5>
              <div className="mb-3">
                <h6 className="text-muted">Recipients</h6>
                <p>{communication.recipients?.join(", ") || "No recipients specified"}</p>
              </div>
              <div className="mb-3">
                <h6 className="text-muted">Deadline</h6>
                <p> 
                  {communication.deadline?.seconds 
                    ? new Date(communication.deadline.seconds * 1000).toLocaleString()
                    : "No deadline"}
                </p>
              </div>
              <div className="mb-3">
                <h6 className="text-muted">Remarks</h6>
                <p>{communication.remarks || "No remarks"}</p>
              </div>
              
              {communication.link && (
                <div className="mb-3">
                  <h6 className="text-muted">Link</h6>
                  <a href={communication.link} target="_blank" rel="noopener noreferrer">
                    {communication.link}
                  </a>
                </div>
              )}

              {communication.attachment && (
                <div className="mb-3">
                  <h6 className="text-muted">Attachment</h6>
                  {isImage(communication.attachment) ? (
                    <img
                      src={communication.attachment}
                      alt="Attachment"
                      className="img-fluid rounded"
                      style={{ maxHeight: "300px" }}
                    />
                  ) : (
                    <a
                      href={communication.attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-primary"
                    >
                      <i className="bx bx-download me-2"></i> Download Attachment
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state text-center py-5">
            <i className="bx bx-message-alt-error fs-1 text-muted mb-3"></i>
            <h4 className="text-muted">Communication Not Found</h4>
            <p className="text-muted">The requested communication could not be loaded</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SentCommunications;