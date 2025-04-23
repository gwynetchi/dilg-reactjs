import React from "react";

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
                    href={msg.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={msg.imageUrl}
                      alt="attachment"
                      style={{ width: "60px", borderRadius: "5px" }}
                    />
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td>{senderNames[msg.createdBy] || "Unknown"}</td>
              <td>{msg.subject || "No Subject"}</td>
              <td>
        {msg.source === "programcommunications" as string  ? (
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
  );
};

export default MessageTable;
