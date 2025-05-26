import { useEffect, useState } from "react";
import { 
  collection, 
  doc, 
  deleteDoc, 
  setDoc,
  onSnapshot,
  serverTimestamp, 
  getDoc,
  query,
  where
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Link } from "react-router-dom";

interface Communication {
  id: string;
  subject: string;
  remarks: string;
  deadline: { seconds: number };
  deletedAt: { seconds: number };
  deletedBy: string | { id: string; name?: string; email?: string };
  createdAt?: { seconds: number };
}

const DeletedCommunications = () => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("Please sign in to view deleted communications");
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          setError("User data not found");
          setLoading(false);
          return;
        }

        const role = userDoc.data().role;
        setUserRole(role);

        const unsubscribeFirestore = onSnapshot(
          role === "Admin" 
            ? collection(db, "deleted_communications")
            : query(
                collection(db, "deleted_communications"),
                where("deletedBy.id", "==", user.uid)
              ),
          (snapshot) => {
            const items = snapshot.docs.map(doc => {
              const commData = doc.data();
              let deletedByName = "Unknown";
              
              if (typeof commData.deletedBy === 'object') {
                deletedByName = commData.deletedBy.name || commData.deletedBy.email || "Unknown";
              } else if (typeof commData.deletedBy === 'string') {
                deletedByName = commData.deletedBy;
              }

              return { 
                id: doc.id, 
                ...commData,
                deletedBy: {
                  ...(typeof commData.deletedBy === 'object' ? commData.deletedBy : { id: commData.deletedBy }),
                  name: deletedByName
                }
              } as Communication;
            });
            setCommunications(items);
            setLoading(false);
          },
          (err) => {
            console.error("Firestore Error:", err);
            setError("Failed to load deleted communications. Please try again.");
            setLoading(false);
          }
        );

        return () => unsubscribeFirestore();
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to verify your permissions");
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleRestore = async (comm: Communication) => {
    try {
      setLoading(true);
      setError("");
      
      // Prepare the restored document
      const { deletedAt, deletedBy, ...restoredData } = comm;
      
      await setDoc(doc(db, "communications", comm.id), {
        ...restoredData,
        restoredAt: serverTimestamp(),
        // Clear deleted-specific fields
        deletedAt: null,
        deletedBy: null
      });

      await deleteDoc(doc(db, "deleted_communications", comm.id));

      setSuccessMessage(`"${comm.subject}" restored successfully!`);
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      console.error("Restore failed:", error);
      setError(`Failed to restore: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const formatDate = (timestamp: { seconds: number } | undefined) => {
    if (!timestamp?.seconds) return "N/A";
    return new Date(timestamp.seconds * 1000).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="dashboard-container">
        <div className="head-title">
          <div className="left">
            <h1>Deleted Communications</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/">Dashboard</Link>
                </li>
                <li className="breadcrumb-item active">Deleted Communications</li>
              </ol>
            </nav>
          </div>
        </div>

        {/* Status Messages */}
        {successMessage && (
          <div className="alert alert-success d-flex align-items-center gap-2 mb-3">
            <i className="bx bx-check-circle fs-4"></i>
            <div>{successMessage}</div>
          </div>
        )}
        
        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
            <i className="bx bx-error-circle fs-4"></i>
            <div>{error}</div>
          </div>
        )}

        {userRole !== "Admin" && (
          <div className="alert alert-info d-flex align-items-center gap-2 mb-3">
            <i className="bx bx-info-circle fs-4"></i>
            <div>You're only seeing communications you deleted. Admins can view all deleted communications.</div>
          </div>
        )}

        {loading ? (
          <div className="text-center my-5 py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : communications.length === 0 ? (
          <div className="empty-state text-center py-5">
            <i className="bx bx-message-square-x fs-1 text-muted mb-3"></i>
            <h4 className="text-muted">
              {userRole === "Admin" 
                ? "No Deleted Communications" 
                : "No Communications Deleted By You"}
            </h4>
            <p className="text-muted">
              {userRole === "Admin" 
                ? "There are currently no deleted communications in the system" 
                : "You haven't deleted any communications yet"}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>Subject</th>
                <th>Remarks</th>
                <th>Deadline</th>
                <th>Deleted At</th>
                <th>Deleted By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {communications.map((comm) => (
                <tr key={comm.id}>
                  <td>{comm.subject}</td>
                  <td>{comm.remarks}</td>
                  <td>{formatDate(comm.deadline)}</td>
                  <td>{formatDate(comm.deletedAt)}</td>
                  <td>
                    {typeof comm.deletedBy === 'string' 
                      ? comm.deletedBy 
                      : comm.deletedBy.name || comm.deletedBy.email || "System"}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => {
                        setSelectedComm(comm);
                        setShowConfirm(true);
                      }}
                      disabled={loading}
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && selectedComm && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Restore</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to restore:<br />
                  <strong>"{selectedComm.subject}"</strong>?
                </p>
                <div className="mt-3">
                  <small className="text-muted">
                    <strong>Deleted on:</strong> {formatDate(selectedComm.deletedAt)}
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => handleRestore(selectedComm)}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Restoring...
                    </>
                  ) : 'Confirm Restore'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletedCommunications;