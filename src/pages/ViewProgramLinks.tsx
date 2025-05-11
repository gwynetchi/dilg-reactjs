import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import Swal from "sweetalert2";
import { formatDistanceToNow } from "date-fns";

interface Occurrence {
  date: string;
  monitoringLink: string | null;
  submissionLink: string | null;
  submitted?: boolean;
  submittedAt?: Date | null;
  notes?: string;
}

const ViewProgramLinks: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [documentId, setDocumentId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "submitted" | "unsubmitted">("all");
  const [sortConfig, setSortConfig] = useState<{ key: "date" | "status"; direction: "asc" | "desc" }>({
    key: "date",
    direction: "asc",
  });
  const [searchTerm, setSearchTerm] = useState<string>("");

  const showToast = (title: string, icon: "success" | "error" | "warning" | "info" = "success") => {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
      },
    });

    Toast.fire({
      icon,
      title,
    });
  };

  useEffect(() => {
    const fetchOccurrences = async () => {
      try {
        setLoading(true);
        // Try to load from cache first
        const cachedData = localStorage.getItem(`programLinks-${programId}`);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          setOccurrences(parsedData.occurrences);
          setDocumentId(parsedData.documentId);
        }

        const q = query(
          collection(db, "programlinks"),
          where("programId", "==", programId)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docId = snapshot.docs[0].id;
          setDocumentId(docId);
          
          const data = snapshot.docs[0].data();
          const items: Occurrence[] = (data.occurrences || []).map((item: any) => ({
            date: item.date,
            monitoringLink: item.monitoringLink || null,
            submissionLink: item.submissionLink || null,
            submitted: item.submitted || false,
            submittedAt: item.submittedAt?.toDate() || null,
            notes: item.notes || "",
          }));
          setOccurrences(items);
          
          // Cache the data
          localStorage.setItem(`programLinks-${programId}`, JSON.stringify({
            occurrences: items,
            documentId: docId,
            lastUpdated: new Date().toISOString()
          }));
        } else {
          showToast("No program links found for this program.", "info");
        }
      } catch (err) {
        console.error("Error fetching occurrences:", err);
        showToast("Failed to load program links. Using cached data if available.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchOccurrences();
  }, [programId]);

  const requestSort = (key: "date" | "status") => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedOccurrences = useMemo(() => {
    let filtered = [...occurrences];
    
    // Apply filter
    if (filter === "submitted") {
      filtered = filtered.filter(occ => occ.submitted);
    } else if (filter === "unsubmitted") {
      filtered = filtered.filter(occ => !occ.submitted);
    }
    
    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(occ => 
        occ.date.toLowerCase().includes(term) ||
        (occ.notes && occ.notes.toLowerCase().includes(term))
      );
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      if (sortConfig.key === "date") {
        return sortConfig.direction === "asc" 
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        // status sorting (submitted first or last)
        if (a.submitted === b.submitted) return 0;
        if (sortConfig.direction === "asc") {
          return a.submitted ? -1 : 1;
        } else {
          return a.submitted ? 1 : -1;
        }
      }
    });
  }, [occurrences, filter, searchTerm, sortConfig]);

  const toggleSelectItem = (date: string) => {
    setSelectedItems(prev =>
      prev.includes(date) 
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredAndSortedOccurrences.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredAndSortedOccurrences.map(occ => occ.date));
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDateStatus = (dateStr: string) => {
    const today = new Date();
    const date = new Date(dateStr);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "overdue";
    if (diffDays <= 3) return "upcoming";
    return "normal";
  };

  const handleMarkAsSubmitted = async (date: string) => {
    const result = await Swal.fire({
      title: "Confirm Submission",
      text: "Are you sure you want to mark this as submitted?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, mark as submitted",
    });
    
    if (!result.isConfirmed) return;
    
    await updateSubmissionStatus([date], true);
  };

  const handleUnmarkAsSubmitted = async (date: string) => {
    const result = await Swal.fire({
      title: "Confirm Unmark",
      text: "Are you sure you want to unmark this submission?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, unmark it",
    });
    
    if (!result.isConfirmed) return;
    
    await updateSubmissionStatus([date], false);
  };

  const handleBatchSubmit = async () => {
    if (selectedItems.length === 0) {
      showToast("Please select items to mark", "warning");
      return;
    }
    
    const result = await Swal.fire({
      title: `Mark ${selectedItems.length} items as submitted?`,
      text: "This action cannot be undone",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: `Mark ${selectedItems.length} items`,
    });
    
    if (!result.isConfirmed) return;
    
    await updateSubmissionStatus(selectedItems, true);
    setSelectedItems([]);
  };

  const updateSubmissionStatus = async (dates: string[], submitted: boolean) => {
    if (!documentId) return;
    
    setSubmittingId(dates[0]);
    
    try {
      const docRef = doc(db, "programlinks", documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedOccurrences = data.occurrences.map((occ: any) => {
          if (dates.includes(occ.date)) {
            return { 
              ...occ, 
              submitted,
              submittedAt: submitted ? new Date() : null 
            };
          }
          return occ;
        });
        
        await updateDoc(docRef, { occurrences: updatedOccurrences });
        
        setOccurrences(prev => 
          prev.map(occ => 
            dates.includes(occ.date) 
              ? { ...occ, submitted, submittedAt: submitted ? new Date() : null }
              : occ
          )
        );
        
        // Update cache
        const cachedData = localStorage.getItem(`programLinks-${programId}`);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          const updatedCache = {
            ...parsedData,
            occurrences: parsedData.occurrences.map((occ: any) => 
              dates.includes(occ.date)
                ? { ...occ, submitted, submittedAt: submitted ? new Date() : null }
                : occ
            )
          };
          localStorage.setItem(`programLinks-${programId}`, JSON.stringify(updatedCache));
        }
        
        showToast(
          submitted 
            ? `Successfully marked ${dates.length} item(s) as submitted`
            : `Successfully unmarked ${dates.length} item(s)`,
          "success"
        );
      }
    } catch (error) {
      console.error("Error updating submission status:", error);
      showToast("Failed to update submission status", "error");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleAddNote = async (date: string, currentNote: string) => {
    const { value: notes } = await Swal.fire({
      title: "Add/Edit Notes",
      input: "textarea",
      inputValue: currentNote || "",
      inputAttributes: {
        "aria-label": "Type your notes here"
      },
      showCancelButton: true,
      confirmButtonText: "Save Notes",
      cancelButtonText: "Cancel",
    });
    
    if (notes === undefined) return; // User cancelled
    
    try {
      const docRef = doc(db, "programlinks", documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedOccurrences = data.occurrences.map((occ: any) => {
          if (occ.date === date) {
            return { ...occ, notes };
          }
          return occ;
        });
        
        await updateDoc(docRef, { occurrences: updatedOccurrences });
        
        setOccurrences(prev => 
          prev.map(occ => 
            occ.date === date ? { ...occ, notes } : occ
          )
        );
        
        // Update cache
        const cachedData = localStorage.getItem(`programLinks-${programId}`);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          const updatedCache = {
            ...parsedData,
            occurrences: parsedData.occurrences.map((occ: any) => 
              occ.date === date ? { ...occ, notes } : occ
            )
          };
          localStorage.setItem(`programLinks-${programId}`, JSON.stringify(updatedCache));
        }
        
        showToast("Notes saved successfully", "success");
      }
    } catch (error) {
      console.error("Error saving notes:", error);
      showToast("Failed to save notes", "error");
    }
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center py-5">
        <div className="spinner-border text-primary" style={{ width: "3rem", height: "3rem" }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading program links...</p>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 d-flex flex-column flex-md-row justify-content-between align-items-md-center">
          <div>
            <h2 className="mb-0 d-flex align-items-center">
              <i className="bi bi-link-45deg me-2 text-primary"></i>
              Program Links
            </h2>
            {programId && (
              <small className="text-muted">Program ID: {programId}</small>
            )}
          </div>
          
          <div className="mt-2 mt-md-0">
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Search dates or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="btn btn-outline-secondary" type="button">
                <i className="bi bi-search"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3">
            <div className="btn-group mb-2 mb-md-0" role="group">
              <button
                type="button"
                className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filter === "submitted" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setFilter("submitted")}
              >
                Submitted
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filter === "unsubmitted" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setFilter("unsubmitted")}
              >
                Unsubmitted
              </button>
            </div>
            
            {selectedItems.length > 0 && (
              <button
                className="btn btn-success btn-sm"
                onClick={handleBatchSubmit}
                disabled={submittingId !== null}
              >
                <i className="bi bi-check2-all me-1"></i>
                Mark {selectedItems.length} Selected
              </button>
            )}
          </div>
          
          {filteredAndSortedOccurrences.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "5%" }}>
                      <input
                        type="checkbox"
                        checked={selectedItems.length === filteredAndSortedOccurrences.length}
                        onChange={toggleSelectAll}
                        className="form-check-input"
                      />
                    </th>
                    <th style={{ width: "20%" }} onClick={() => requestSort("date")}>
                      <div className="d-flex align-items-center cursor-pointer">
                        Date
                        <i className={`bi bi-arrow-${sortConfig.key === "date" && sortConfig.direction === "asc" ? "up" : "down"} ms-1`}></i>
                      </div>
                    </th>
                    <th style={{ width: "20%" }}>Monitoring</th>
                    <th style={{ width: "20%" }}>Submission</th>
                    <th style={{ width: "15%" }} onClick={() => requestSort("status")}>
                      <div className="d-flex align-items-center cursor-pointer">
                        Status
                        <i className={`bi bi-arrow-${sortConfig.key === "status" && sortConfig.direction === "asc" ? "up" : "down"} ms-1`}></i>
                      </div>
                    </th>
                    <th style={{ width: "10%" }}>Notes</th>
                    <th style={{ width: "10%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedOccurrences.map((occ) => {
                    const dateStatus = getDateStatus(occ.date);
                    const isSelected = selectedItems.includes(occ.date);
                    
                    return (
                      <tr 
                        key={occ.date} 
                        className={`
                          ${occ.submitted ? "table-success" : ""}
                          ${dateStatus === "upcoming" ? "table-warning" : ""}
                          ${dateStatus === "overdue" && !occ.submitted ? "table-danger" : ""}
                          ${isSelected ? "table-active" : ""}
                        `}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectItem(occ.date)}
                            className="form-check-input"
                          />
                        </td>
                        <td className="fw-semibold">
                          <div className="d-flex flex-column">
                            <span>{formatDate(occ.date)}</span>
                            {dateStatus === "upcoming" && (
                              <small className="text-warning">
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                Due soon
                              </small>
                            )}
                            {dateStatus === "overdue" && !occ.submitted && (
                              <small className="text-danger">
                                <i className="bi bi-exclamation-circle me-1"></i>
                                Overdue
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          {occ.monitoringLink ? (
                            <a
                              href={occ.monitoringLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline-primary btn-sm w-100 text-start d-flex align-items-center"
                            >
                              <i className="bi bi-eye me-2"></i>
                              Monitor
                            </a>
                          ) : (
                            <span className="text-muted fst-italic">N/A</span>
                          )}
                        </td>
                        <td>
                          {occ.submissionLink ? (
                            <a
                              href={occ.submissionLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline-success btn-sm w-100 text-start d-flex align-items-center"
                            >
                              <i className="bi bi-file-earmark-text me-2"></i>
                              Submit
                            </a>
                          ) : (
                            <span className="text-muted fst-italic">N/A</span>
                          )}
                        </td>
                        <td>
                          {occ.submitted ? (
                            <div className="d-flex flex-column">
                              <div className="d-flex align-items-center text-success">
                                <i className="bi bi-check-circle-fill me-2"></i>
                                Submitted
                              </div>
                              {occ.submittedAt && (
                                <small className="text-muted">
                                  {formatDistanceToNow(new Date(occ.submittedAt))} ago
                                </small>
                              )}
                            </div>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center"
                              onClick={() => handleMarkAsSubmitted(occ.date)}
                              disabled={submittingId === occ.date}
                            >
                              {submittingId === occ.date ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-check2-square me-2"></i>
                                  Mark
                                </>
                              )}
                            </button>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-secondary w-100"
                            onClick={() => handleAddNote(occ.date, occ.notes || "")}
                            title={occ.notes || "Add notes"}
                          >
                            <i className="bi bi-pencil-square me-1"></i>
                            {occ.notes ? "View/Edit" : "Add"}
                          </button>
                        </td>
                        <td>
                          {occ.submitted ? (
                            <button
                              className="btn btn-sm btn-outline-danger w-100"
                              onClick={() => handleUnmarkAsSubmitted(occ.date)}
                              disabled={submittingId === occ.date}
                            >
                              <i className="bi bi-arrow-counterclockwise me-1"></i>
                              Unmark
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <i className="bi bi-link-45deg text-muted" style={{ fontSize: "3rem" }}></i>
              <h4 className="mt-3">No Matching Links Found</h4>
              <p className="text-muted">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Card View (hidden on larger screens) */}
      <div className="d-md-none mt-3">
        {filteredAndSortedOccurrences.length > 0 && (
          <div className="row">
            {filteredAndSortedOccurrences.map((occ) => {
              const dateStatus = getDateStatus(occ.date);
              
              return (
                <div key={occ.date} className="col-12 mb-3">
                  <div className={`card ${
                    occ.submitted ? "border-success" : 
                    dateStatus === "upcoming" ? "border-warning" :
                    dateStatus === "overdue" ? "border-danger" : ""
                  }`}>
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <div>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(occ.date)}
                          onChange={() => toggleSelectItem(occ.date)}
                          className="form-check-input me-2"
                        />
                        <strong>{formatDate(occ.date)}</strong>
                      </div>
                      {occ.submitted ? (
                        <span className="badge bg-success">
                          <i className="bi bi-check-circle me-1"></i>
                          Submitted
                        </span>
                      ) : dateStatus === "upcoming" ? (
                        <span className="badge bg-warning text-dark">
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          Due soon
                        </span>
                      ) : dateStatus === "overdue" ? (
                        <span className="badge bg-danger">
                          <i className="bi bi-exclamation-circle me-1"></i>
                          Overdue
                        </span>
                      ) : null}
                    </div>
                    <div className="card-body">
                      <div className="mb-2">
                        <strong>Monitoring:</strong> {occ.monitoringLink ? (
                          <a href={occ.monitoringLink} target="_blank" rel="noopener noreferrer">
                            Open Link
                          </a>
                        ) : "N/A"}
                      </div>
                      <div className="mb-2">
                        <strong>Submission:</strong> {occ.submissionLink ? (
                          <a href={occ.submissionLink} target="_blank" rel="noopener noreferrer">
                            Open Link
                          </a>
                        ) : "N/A"}
                      </div>
                      {occ.notes && (
                        <div className="mb-2">
                          <strong>Notes:</strong> {occ.notes}
                        </div>
                      )}
                      {occ.submittedAt && (
                        <div className="mb-2 text-muted">
                          <small>Submitted {formatDistanceToNow(new Date(occ.submittedAt))} ago</small>
                        </div>
                      )}
                    </div>
                    <div className="card-footer d-flex justify-content-between">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleAddNote(occ.date, occ.notes || "")}
                      >
                        <i className="bi bi-pencil-square"></i> Notes
                      </button>
                      {occ.submitted ? (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleUnmarkAsSubmitted(occ.date)}
                        >
                          <i className="bi bi-arrow-counterclockwise"></i> Unmark
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleMarkAsSubmitted(occ.date)}
                        >
                          <i className="bi bi-check2-square"></i> Mark
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewProgramLinks;