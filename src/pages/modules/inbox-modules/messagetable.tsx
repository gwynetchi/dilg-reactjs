import React from "react";

// Define the structure for a communication message
interface Communication {
  id: string;
  createdBy: string;
  recipients: string[];
  seenBy: string[];
  subject?: string;
  createdAt?: {
    seconds: number;
    nanoseconds?: number;
  } | null;
  deadline?: {
    seconds: number;
    nanoseconds?: number;
  } | null;
  outcomeArea?: string;
}

interface Props {
  messages: Communication[];
  userId: string | null;
  senderNames: { [key: string]: string };
  openMessage: (id: string) => void;
handleDeleteRequest: (id: string, recipients: string[], source: "communications" | "programcommunications") => void;  getDeadlineStatus: (deadline?: { seconds: number }) => string;
  getStatusStyles: (status: string) => {
    className: string;
    text: string;
    icon: string;
  };
}

// Outcome Area options
const outcomeOptions = [
  {
    value: "Excellence in Local Governance Upheld",
    label: "Excellence in Local Governance Upheld",
    color: "#ffc107",
    textColor: "#000",
  },
  {
    value: "Peaceful, Orderly, and Safe Communities Strengthened",
    label: "Peaceful, Orderly, and Safe Communities Strengthened",
    color: "#0d6efd",
    textColor: "#fff",
  },
  {
    value: "Resilient Communities Reinforced",
    label: "Resilient Communities Reinforced",
    color: "#198754",
    textColor: "#fff",
  },
  {
    value: "Inclusive Communities Enabled",
    label: "Inclusive Communities Enabled",
    color: "#6f42c1",
    textColor: "#fff",
  },
  {
    value: "Highly Trusted Department and Partner",
    label: "Highly Trusted Department and Partner",
    color: "#dc3545",
    textColor: "#fff",
  },
];

const MessageTable: React.FC<Props> = ({
  messages,
  userId,
  senderNames,
  openMessage,
  handleDeleteRequest,
  getDeadlineStatus,
  getStatusStyles,
}) => {
  const renderDeadline = (deadline?: { seconds: number }) => {
    const status = getDeadlineStatus(deadline);
    const { className, text, icon } = getStatusStyles(status);

    if (!deadline) {
      return <span className={className}>{icon} {text}</span>;
    }

    const deadlineDate = new Date(deadline.seconds * 1000);
    const dateStr = deadlineDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = deadlineDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return (
      <div className="d-flex align-items-center gap-2">
        <span className={className}>{icon} {text}</span>
        <span>{dateStr} {timeStr}</span>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <table className="table">
        <thead>
          <tr>
            <th>Outcome Area</th>
            <th>Focal Person</th>
            <th>Subject</th>
            <th>Deadline</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((msg) => {
            const createdDate = msg.createdAt?.seconds
              ? new Date(msg.createdAt.seconds * 1000).toLocaleString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Unknown";

            const isSeen = msg.seenBy?.includes(userId || "");
console.log("Outcome Area for message:", msg.outcomeArea);

            const outcome = outcomeOptions.find(
              (option) => option.value === msg.outcomeArea
              
            );

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
                  {msg.outcomeArea ? (
                    <span
                      className="badge"
                      style={{
                        backgroundColor: outcome?.color || "#6c757d",
                        color: outcome?.textColor || "#fff",
                        padding: "5px 10px",
                        borderRadius: "10px",
                        fontSize: "0.75rem",
                      }}
                    >
                      {outcome?.label || msg.outcomeArea}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>{senderNames[msg.createdBy] || "Unknown"}</td>
                <td>{msg.subject || "No Subject"}</td>
                <td>{renderDeadline(msg.deadline || undefined)}</td>
                <td>{createdDate}</td>
                <td>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRequest(msg.id, msg.recipients, "communications");
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
