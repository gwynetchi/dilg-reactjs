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
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "communications" | "programcommunications">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [senderNames, setSenderNames] = useState<{ [key: string]: string }>({});
  const [showModal, setShowModal] = useState(false);
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
        senderNames[msg.createdBy]?.toLowerCase().includes(term)
      );
    })
    .filter((msg) => filterType === "all" || msg.source === filterType)
    .sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h1>Inbox</h1>
              <ul className="breadcrumb">
                <li>
                  <a href="/dashboards" className="active">Home</a>
                </li>
                <li>
                  <i className="bx bx-chevron-right"></i>
                </li>
                <li>
                  <a>Inbox</a>
                </li>
              </ul>
            </div>
          </div>
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
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </section>
      <DeleteMessageModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onDelete={deleteMessage}
      />
    </div>
  );
};

export default Inbox;