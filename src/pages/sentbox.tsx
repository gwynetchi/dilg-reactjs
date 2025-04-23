import React, { useState, useEffect } from "react";
import { collection, query, where, doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

const Sentbox: React.FC = () => {
  interface Communication {
    recipients: string[];
    id: string;
    createdBy: string;
    subject?: string;
    createdAt?: {
      seconds: number;
      nanoseconds?: number;
    } | null;
  }

  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
const [filterType, setFilterType] = useState("all");
const [sortOrder, setSortOrder] = useState("desc");


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const commRef = collection(db, "communications");
    const q = query(commRef, where("createdBy", "==", userId));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setLoading(true);
      const messages = querySnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          createdBy: data.createdBy,
          recipients: data.recipients || [],
          createdAt: data.createdAt || null,
          subject: data.subject || "No Subject",
        };
      });
      setCommunications(messages);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  const deleteMessage = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteDoc(doc(db, "communications", id));
      setCommunications((prev) => prev.filter((msg) => msg.id !== id));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const openMessage = (id: string) => {
    navigate(`/sent/${id}`);
  };

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h1>Sent</h1>
              <ul className="breadcrumb">
                <li>
                  <Link to="/dashboards" className="active">Home</Link>
                </li>
                <li>
                  <i className="bx bx-chevron-right"></i>
                </li>
                <li>
                  <Link to="#" className="active">Sent</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="table-data">
            <div className="order">
            <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
  {/* Search */}
  <label htmlFor="searchInput" className="form-label mb-0">Search:</label>
  <input
    id="searchInput"
    type="text"
    placeholder="Search subject..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="form-control w-auto"
  />

  {/* Filter */}
  <label htmlFor="filterSelect" className="form-label mb-0">Filter:</label>
  <select
    id="filterSelect"
    value={filterType}
    onChange={(e) => setFilterType(e.target.value)}
    className="form-select w-auto"
  >
    <option value="all">All</option>
    {/* Extend with options like sent to specific roles, etc. */}
  </select>

  {/* Sort */}
  <label htmlFor="sortSelect" className="form-label mb-0">Sort:</label>
  <select
    id="sortSelect"
    value={sortOrder}
    onChange={(e) => setSortOrder(e.target.value)}
    className="form-select w-auto"
  >
    <option value="desc">Newest First</option>
    <option value="asc">Oldest First</option>
  </select>
</div>

              <div className="inbox-container">
                <h2>Sent Messages</h2>
                {loading ? (
                  <p>Loading messages...</p>
                ) : communications.length === 0 ? (
                  <p>No messages found.</p>
                ) : (
                  <table className="inbox-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                    {communications
  .filter((msg) =>
    msg.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  .filter((msg) => {
    if (filterType === "all") return true;
    return msg.recipients.includes(filterType); // example logic
  })
  
  .sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    const timeA = a.createdAt.seconds;
    const timeB = b.createdAt.seconds;
    return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
  })
  .map((msg) => (

                        <tr key={msg.id} onClick={() => openMessage(msg.id)} style={{ cursor: "pointer" }}>
                          <td>{msg.subject}</td>
                          <td>
                            {msg.createdAt && typeof msg.createdAt.seconds === "number" ? (
                              new Date(msg.createdAt.seconds * 1000).toLocaleString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: true,
                              })
                            ) : (
                              <span style={{ color: "red" }}>No Timestamp</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMessage(msg.id);
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </main>
      </section>
    </div>
  );
};

export default Sentbox;
