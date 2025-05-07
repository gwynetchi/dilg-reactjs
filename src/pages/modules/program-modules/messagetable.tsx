import React, { useState, useEffect } from "react";
import { Table } from "react-bootstrap";
import "../../../styles/components/dashboard.css";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase"; // ✅ Adjust path if needed

export interface Message {
  id: string;
  subject: string;
  body?: string;
  createdAt: any;
  createdBy: string;
  programId: string;
  recipients: string; // string, not array
  sentAt: any;
  imageUrl?: string;
  seenBy?: string[];
}

interface MessageTableProps {
  messages: Message[];
  userId: string | null;
  senderNames: { [key: string]: string };
  handleDeleteRequest: (
    id: string,
    recipients: string,
    source: "communications" | "programcommunications"
  ) => void;
}

const MessageTable: React.FC<MessageTableProps> = ({
  messages,
  userId,
  senderNames,
  handleDeleteRequest,
}) => {
  const [showFileModal, setShowFileModal] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserRole = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userRole = userDoc.data()?.role?.toLowerCase();
        setRole(userRole);
      }
    };
    fetchUserRole();
  }, []);

  const handleAttachmentClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentFileUrl(url);
    setShowFileModal(true);
  };

  const renderAttachment = (url: string) => {
    const isImage = url.match(/\.(jpeg|jpg|gif|png|bmp)$/);
    return isImage ? (
      <img
        src={url}
        alt="attachment"
        style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "5px" }}
      />
    ) : (
      <span>View Attachment</span>
    );
  };

  const renderModal = () => {
    const isImage = currentFileUrl.match(/\.(jpeg|jpg|gif|png|bmp)$/);
    return (
      <div className="overlay">
        <div className="modal-container" style={{ maxWidth: "90vw", maxHeight: "90vh" }}>
          <button className="close-btn" onClick={() => setShowFileModal(false)}>
            ✖
          </button>
          <div className="modal-body" style={{ overflow: "auto" }}>
            {isImage ? (
              <img
                src={currentFileUrl}
                alt="Attachment"
                style={{ maxWidth: "100%", maxHeight: "80vh" }}
              />
            ) : (
              <div>
                <p>This file type cannot be previewed. Please download it instead.</p>
                <a
                  href={currentFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Download File
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      {showFileModal && renderModal()}
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Attachment</th>
            <th>Focal Person</th>
            <th>Subject</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((msg) => {
            const createdDate = msg.createdAt?.toDate
              ? msg.createdAt.toDate().toLocaleString()
              : "Unknown";
            const isSeen = msg.seenBy?.includes(userId || "");

            return (
              <tr
                key={msg.id}
                onClick={() => {
                  if (role) navigate(`/${role}/program-messages/${msg.id}`);
                }}
                style={{
                  cursor: "pointer",
                  fontWeight: isSeen ? "normal" : "bold",
                  backgroundColor: isSeen ? "transparent" : "#f5f5f5",
                }}
              >
                <td>
                  {msg.imageUrl ? (
                    <a
                      href="#"
                      onClick={(e) => handleAttachmentClick(e, msg.imageUrl!)}
                      style={{ cursor: "pointer" }}
                    >
                      {renderAttachment(msg.imageUrl!)}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{senderNames[msg.createdBy] || "Unknown"}</td>
                <td>{msg.subject || "No Subject"}</td>
                <td>{createdDate}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRequest(msg.id, msg.recipients, "programcommunications");
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default MessageTable;
