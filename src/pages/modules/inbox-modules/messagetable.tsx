import React, { useState } from "react";
import "../../../styles/components/dashboard.css";

interface Communication {
  id: string;
  createdBy: string;
  recipients: string[];
  seenBy: string[];
  imageUrl: string;
  subject?: string;
  source: "communications" | "programcommunications";
  createdAt?: {
    seconds: number;
    nanoseconds?: number;
  } | null;
}

interface Props {
  messages: Communication[];
  userId: string | null;
  senderNames: { [key: string]: string };
  openMessage: (id: string) => void;
  handleDeleteRequest: (
    id: string,
    recipients: string[],
    source: "communications" | "programcommunications"
  ) => void;
}

const MessageTable: React.FC<Props> = ({
  messages,
  userId,
  senderNames,
  openMessage,
  handleDeleteRequest,
}) => {
  const [showFileModal, setShowFileModal] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState("");

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
          <button
            className="close-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowFileModal(false);
            }}
          >
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
      <table className="table">
        <thead>
          <tr>
            <th>Attachment</th>
            <th>Focal Person</th>
            <th>Subject</th>
            <th>Type</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((msg) => {
            const createdDate = msg.createdAt?.seconds
              ? new Date(msg.createdAt.seconds * 1000).toLocaleString()
              : "Unknown";
            const isSeen = msg.seenBy?.includes(userId || "");

            return (
              <tr
                key={msg.id}
                onClick={() => openMessage(msg.id)}
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
                      onClick={(e) => handleAttachmentClick(e, msg.imageUrl)}
                      style={{ cursor: "pointer" }}
                    >
                      {renderAttachment(msg.imageUrl)}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{senderNames[msg.createdBy] || "Unknown"}</td>
                <td>{msg.subject || "No Subject"}</td>
                <td>
                  {msg.source === "programcommunications" ? (
                    <span className="program-label">Program Message</span>
                  ) : (
                    <span className="regular-label">Direct Message</span>
                  )}
                </td>
                <td>{createdDate}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRequest(msg.id, msg.recipients, msg.source);
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MessageTable;
