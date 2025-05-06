import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  deleteDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import InboxControls from "./modules/inbox-modules/inboxcontrols";
import DeleteMessageModal from "./modules/inbox-modules/deletemodal";
import MessageTable from "./modules/inbox-modules/messagetable";
import "../styles/components/inbox.module.css"; // Make sure this CSS file exists

const Inbox: React.FC = () => {
  interface Communication {
    id: string;
    createdBy: string;
    recipients: string[];
    seenBy: any;
    imageUrl: any;
    subject?: string;
    source: "communications" | "programcommunications";
    createdAt?: {
      seconds: number;
      nanoseconds?: number;
    } | null;
    deadline?: {
      seconds: number;
      nanoseconds?: number;
    } | null;
    remarks?: string;
    submissionLink?: string;
    monitoringLink?: string;
  }

  // Deadline status helpers
  const getDeadlineStatus = (deadline?: { seconds: number }) => {
    if (!deadline) return 'no-deadline';
    
    const now = new Date();
    const deadlineDate = new Date(deadline.seconds * 1000);
    const timeDiff = deadlineDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (timeDiff <= 0) return 'past-due';
    if (hoursDiff <= 24) return 'urgent';
    if (hoursDiff <= 72) return 'approaching';
    return 'normal';
  };

  const getStatusStyles = (status: string) => {
    switch(status) {
      case 'past-due':
        return { className: 'deadline-past-due', text: 'Past Due', icon: '⏱️' };
      case 'urgent':
        return { className: 'deadline-urgent', text: 'Urgent', icon: '⚠️' };
      case 'approaching':
        return { className: 'deadline-approaching', text: 'Approaching', icon: '⏳' };
      case 'no-deadline':
        return { className: 'deadline-none', text: 'No Deadline', icon: '∞' };
      default:
        return { className: '', text: 'Normal', icon: '✓' };
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "communications" | "programcommunications">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [senderNames, setSenderNames] = useState<{ [key: string]: string }>({});
  const [showModal, setShowModal] = useState(false);
  const [urgentCount, setUrgentCount] = useState(0);
  const [pastDueCount, setPastDueCount] = useState(0);

  const [selectedMessage, setSelectedMessage] = useState<{
    id: string;
    recipients: string[];
    source: "communications" | "programcommunications";
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const userRef = doc(db, "users", user.uid);
        onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            setUserRole(userSnap.data().role);
          }
        });
      } else {
        setUserId(null);
        setUserRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const commRef = collection(db, "communications");
    const progCommRef = collection(db, "programcommunications");

    const q1 = query(commRef, where("recipients", "array-contains", userId));
    const q2 = query(progCommRef, where("recipients", "array-contains", userId));

    setLoading(true);

    const unsub1 = onSnapshot(q1, (snap1) => {
      const commMessages = snap1.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          createdBy: data.createdBy,
          recipients: data.recipients || [],
          createdAt: data.createdAt || serverTimestamp(),
          seenBy: data.seenBy || [],
          subject: data.subject || "No Subject",
          imageUrl: data.imageUrl || "",
          deadline: data.deadline || null,
          remarks: data.remarks || "",
          submissionLink: data.submissionLink || "",
          monitoringLink: data.monitoringLink || "",
          source: "communications" as "communications"
        };
      });

      updateMessages(commMessages, "communications");
    });

    const unsub2 = onSnapshot(q2, (snap2) => {
      const progCommMessages = snap2.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          createdBy: data.createdBy,
          recipients: data.recipients || [],
          createdAt: data.createdAt || serverTimestamp(),
          seenBy: data.seenBy || [],
          subject: data.subject || "No Subject",
          imageUrl: data.imageUrl || "",
          deadline: data.deadline || null,
          remarks: data.remarks || "",
          submissionLink: data.submissionLink || "",
          monitoringLink: data.monitoringLink || "",
          source: "programcommunications" as "programcommunications"
        };
      });

      updateMessages(progCommMessages, "programcommunications");
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [userId]);

  const updateMessages = (newMessages: Communication[], source: string) => {
    setCommunications((prevMessages) => {
      const filteredPrev = prevMessages.filter((msg) => msg.source !== source);
      const combined = [...filteredPrev, ...newMessages];
      return combined.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
    });

    newMessages.forEach((msg) => {
      if (!senderNames[msg.createdBy]) {
        listenToSenderProfile(msg.createdBy);
      }
    });

    setLoading(false);
  };

  const deleteMessage = async () => {
    if (!selectedMessage || !userId) return;
    const { id, recipients, source } = selectedMessage;

    try {
      const updatedRecipients = recipients.filter((recipient) => recipient !== userId);
      const messageRef = doc(db, source, id);

      if (updatedRecipients.length === 0) {
        await deleteDoc(messageRef);
      } else {
        await updateDoc(messageRef, {
          recipients: updatedRecipients
        });
      }

      setCommunications((prev) =>
        prev.filter((msg) => msg.id !== id || updatedRecipients.length > 0)
      );
    } catch (error) {
      console.error("Error deleting message:", error);
    }

    setShowModal(false);
  };

  const listenToSenderProfile = (senderId: string) => {
    const senderRef = doc(db, "users", senderId);
    const unsubscribeSender = onSnapshot(senderRef, (senderSnap) => {
      if (senderSnap.exists()) {
        const senderData = senderSnap.data();
        const { fname, mname, lname, email } = senderData;

        const hasName = fname || mname || lname;
        const senderDisplayName = hasName
          ? `${fname || ""} ${mname ? mname + " " : ""}${lname || ""}`.trim()
          : email || "Unknown Email";

        setSenderNames((prev) => ({
          ...prev,
          [senderId]: senderDisplayName
        }));
      }
    });

    return () => unsubscribeSender();
  };

  const openMessage = async (id: string) => {
    if (!userRole || !userId) return;

    const rolePaths: { [key: string]: string } = {
      Evaluator: "evaluator",
      Viewer: "viewer",
      LGU: "lgu",
      Admin: "admin"
    };

    const messageRef = doc(db, "communications", id);

    try {
      await updateDoc(messageRef, {
        seenBy: arrayUnion(userId)
      });
    } catch (error) {
      console.error("Error marking message as seen:", error);
    }

    navigate(`/${rolePaths[userRole] || "viewer"}/inbox/${id}`);
  };

  const handleDeleteRequest = (
    id: string,
    recipients: string[],
    source: "communications" | "programcommunications"
  ) => {
    setSelectedMessage({ id, recipients, source });
    setShowModal(true);
  };

  const filteredCommunications = communications
    .filter((msg) => {
      const term = searchTerm.toLowerCase();
      return (
        msg.subject?.toLowerCase().includes(term) ||
        senderNames[msg.createdBy]?.toLowerCase().includes(term) ||
        msg.remarks?.toLowerCase().includes(term)
      );
    })
    .filter((msg) => filterType === "all" || msg.source === filterType)
    .sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });

useEffect(() => {
  const urgent = filteredCommunications.filter(msg =>
    msg.deadline ? getDeadlineStatus(msg.deadline) === 'urgent' : false
  ).length;

  const pastDue = filteredCommunications.filter(msg =>
    msg.deadline ? getDeadlineStatus(msg.deadline) === 'past-due' : false
  ).length;

  setUrgentCount(urgent);
  setPastDueCount(pastDue);
}, [filteredCommunications]); // Recalculate when filteredCommunications update

  return (
    <div className="dashboard-container">
        <main>
          <div className="head-title">
            <div className="left">
              <h1>Inbox</h1>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <a href="/dashboards">Home</a>
                  </li>
                  <li className="breadcrumb-item active">Dashboard Tools</li>
                </ol>
              </nav>
            </div>
          </div>

          {/* Urgent messages alert */}
          {urgentCount > 0 && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
              <i className="bx bx-error-circle fs-4"></i>
              <div>
                <strong>Urgent!</strong> You have {urgentCount} message{urgentCount > 1 ? 's' : ''} with deadlines within 24 hours.
              </div>
            </div>
          )}
          {pastDueCount > 0 && (
            <div className="alert alert-warning d-flex align-items-center gap-2 mb-3">
              <i className="bx bx-time-five fs-4"></i>
              <div>
                <strong>Past Due:</strong> You have {pastDueCount} message{pastDueCount > 1 ? 's' : ''} that are overdue.
              </div>
            </div>
          )}

          <div className="table-data">
            <div className="order">
              <InboxControls
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterType={filterType}
                setFilterType={setFilterType}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
              />
              <div className="inbox-container">
                {loading ? (
                  <div className="spinner-overlay">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <MessageTable
                    messages={filteredCommunications}
                    userId={userId}
                    senderNames={senderNames}
                    openMessage={openMessage}
                    handleDeleteRequest={handleDeleteRequest}
                    getDeadlineStatus={getDeadlineStatus}
                    getStatusStyles={getStatusStyles}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      <DeleteMessageModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onDelete={deleteMessage}
      />
    </div>
  );
};

export default Inbox;