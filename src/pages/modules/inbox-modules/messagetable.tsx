import React, { useState } from "react";
import "../../../styles/components/dashboard.css"; // Ensure you have the corresponding CSS file

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
  handleDeleteRequest: (id: string, recipients: string[], source: "communications" | "programcommunications") => void;
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

  return (
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
          return (
            <tr
              key={msg.id}
              onClick={() => openMessage(msg.id)}
              style={{
                cursor: "pointer",
                fontWeight: msg.seenBy?.includes(userId || "") ? "normal" : "bold",
                backgroundColor: msg.seenBy?.includes(userId || "") ? "transparent" : "#f5f5f5",
              }}
            >
              <td>
                {msg.imageUrl ? (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation(); // Prevent row click when interacting with the attachment
                      setCurrentFileUrl(msg.imageUrl);
                      setShowFileModal(true);
                    }}
                    style={{ cursor: "pointer" }}
                  >
{msg.imageUrl.match(/\.(jpeg|jpg|gif|png|bmp)$/) ? (
  <img
    src={msg.imageUrl}
    alt="attachment"
    style={{
      width: "80px",
      height: "80px",
      objectFit: "cover",
      borderRadius: "5px"
    }}
  />
) : (
  <span>View Attachment</span>
)}

                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td>{msg.subject || "No Subject"}</td>
              <td>{senderNames[msg.createdBy] || "Unknown"}</td>
              <td>
                {msg.source === "programcommunications" ? (
                  <span className="program-label">Program Message</span>
                ) : (
                  <span className="regular-label">Direct Message</span>
                )}
              </td>
              {showFileModal && (
                <div className="overlay">
                  <div className="modal-container" style={{ maxWidth: "90vw", maxHeight: "90vh" }}>
                    <button
                      className="close-btn"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click when closing the modal
                        setShowFileModal(false);
                      }}
                    >
                      ✖
                    </button>
                    <div className="modal-body" style={{ overflow: "auto" }}>
                      {currentFileUrl.match(/\.(jpeg|jpg|gif|png|bmp)$/) ? (
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
              )}
              <td>{createdDate}</td>
              <td>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click when deleting the message
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
  );
};

export default MessageTable;
