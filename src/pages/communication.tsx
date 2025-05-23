import { getAuth } from "firebase/auth";
import React, { useState, useEffect } from "react";
import Select, { ActionMeta, MultiValue } from "react-select";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
  getDocs as firestoreGetDocs,
  updateDoc,
} from "firebase/firestore";
import { softDelete } from "./../pages/modules/inbox-modules/softDelete";
import { db } from "../firebase";
import Swal from 'sweetalert2';
import OutcomeAreaDropdown from "./modules/program-modules/OutcomeAreaDropdown";
import { Link } from "react-router-dom";

interface User {
  role: string;
  id: string;
  fullName: string;
  email: string;
}

interface Communication {
  id: string;
  subject: string;
  recipients: string[];
  deadline: { seconds: number };
  remarks: string;
  submissionLink?: string;
  monitoringLink?: string;
  imageUrl?: string;
  createdAt?: Date;
}
interface OutcomeOption {
  value: string;
  label: string;
  color: string;
  textColor: string;
}

interface Alert {
  id: number;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

const Communication: React.FC = () => {
  const [subject, setSubject] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [monitoringLink, setMonitoringLink] = useState("");  
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sentCommunications, setSentCommunications] = useState<Communication[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [recipientDetails, setRecipientDetails] = useState<{ id: string; fullName: string; email: string } | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFileModal, setShowFileModal] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filteredCommunications, setFilteredCommunications] = useState<Communication[]>([]);
  const [alert, setAlert] = useState<Alert | null>(null);
const [outcomeArea, setOutcomeArea] = useState<OutcomeOption | null>(null);
  // Group users by roles with counts
  const groupedOptions = Object.entries(
    users.reduce((groups, user) => {
      const role = user.role || "No Role";
      if (!groups[role]) groups[role] = [];
      groups[role].push({ 
        value: user.id, 
        label: user.fullName 
      });
      return groups;
    }, {} as Record<string, { value: string; label: string }[]>)
  ).map(([role, options]) => ({
    label: `${role.charAt(0).toUpperCase() + role.slice(1)} (${options.length})`,
    options: [
      {
        value: `toggle_all_${role}`,
        label: `Select all ${role}`,
        isSelectAll: true,
        role,
      },
      ...options,
    ],
  }));

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);

      const usersList = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const fullName = `${data.fname} ${data.mname || ""} ${data.lname}`.trim() || data.email || "Unknown User";
        return { 
          id: doc.id, 
          fullName, 
          email: data.email, 
          role: data.role || "No Role"  
        };
      });

      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    setImageUrl(""); // Clear any previous image URL
  };
  
  const fetchSentCommunications = async () => {
    const auth = getAuth(); 
    const user = auth.currentUser;
    if (user) {
      try {
        const communicationsRef = collection(db, "communications");
        const q = query(communicationsRef, where("createdBy", "==", user.uid));
        const querySnapshot = await firestoreGetDocs(q);
  
        if (!querySnapshot.empty) {
          const sentList = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt ? data.createdAt.toDate() : null;

            return {
              id: doc.id,
              ...data,
              createdAt,
              recipients: data.recipients || [],
              deadline: data.deadline || { seconds: 0 },
              remarks: data.remarks || "",
            } as Communication;
          });
  
          // Sort by createdAt field
          sentList.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.getTime() : 0;
            const dateB = b.createdAt ? b.createdAt.getTime() : 0;
            return dateB - dateA;
          });
  
          setSentCommunications(sentList);
          setFilteredCommunications(sentList);
        } else {
          console.log("No sent communications found.");
          setSentCommunications([]);
          setFilteredCommunications([]);
        }
      } catch (error) {
        console.error("Error fetching sent communications:", error);
      }
    }
  };

  useEffect(() => {
    let filtered = sentCommunications.filter((comm) =>
      comm.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.remarks.toLowerCase().includes(searchTerm.toLowerCase())
    );
  
    filtered.sort((a, b) => {
      const aField = a[sortField as keyof Communication];
      const bField = b[sortField as keyof Communication];
  
      if (aField && bField) {
        const aVal = aField instanceof Date ? aField.getTime() : 
                    typeof aField === 'string' ? aField.toLowerCase() : 
                    aField;
        const bVal = bField instanceof Date ? bField.getTime() : 
                    typeof bField === 'string' ? bField.toLowerCase() : 
                    bField;
  
        return sortOrder === "asc" ? 
          (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) : 
          (bVal < aVal ? -1 : bVal > aVal ? 1 : 0);
      }
      return 0;
    });
  
    setFilteredCommunications(filtered);
  }, [searchTerm, sentCommunications, sortField, sortOrder]);
  
  useEffect(() => {
    fetchUsers();
    fetchSentCommunications();
  }, []);

  const handleRecipientChange = (
    newValue: MultiValue<{ value: string; label: string; isSelectAll?: boolean; role?: string }>,
    actionMeta: ActionMeta<{ value: string; label: string; isSelectAll?: boolean; role?: string }>
  ) => {
    if (actionMeta.action === 'remove-value' || 
        actionMeta.action === 'pop-value' ||
        actionMeta.action === 'deselect-option') {
      const removedValue = actionMeta.removedValue || actionMeta.option;
      
      if (!removedValue) return;
      
      if (!removedValue.isSelectAll) {
        setRecipients(prev => prev.filter(id => id !== removedValue.value));
        return;
      }
      
      if (removedValue.isSelectAll && removedValue.role) {
        const usersInRole = users
          .filter(user => user.role === removedValue.role)
          .map(user => user.id);
        setRecipients(prev => prev.filter(id => !usersInRole.includes(id)));
        return;
      }
    }
    
    const selectedOptions = newValue;
    let newRecipients = [...recipients];
    
    const toggledSelectAlls = selectedOptions
      .filter(option => option.isSelectAll && option.role)
      .map(option => option.role);
  
    toggledSelectAlls.forEach(role => {
      if (!role) return;
      
      const usersInRole = users
        .filter(user => user.role === role)
        .map(user => user.id);
  
      const wasJustSelected = selectedOptions.some(
        opt => opt.isSelectAll && opt.role === role && !recipients.includes(opt.value)
      );
  
      if (wasJustSelected) {
        const allCurrentlySelected = usersInRole.every(id => recipients.includes(id));
        
        if (allCurrentlySelected) {
          newRecipients = newRecipients.filter(id => !usersInRole.includes(id));
        } else {
          newRecipients = newRecipients.filter(id => {
            const user = users.find(u => u.id === id);
            return user?.role !== role;
          });
          newRecipients = [...newRecipients, ...usersInRole];
        }
      }
    });
  
    const regularSelections = selectedOptions
      .filter(option => !option.isSelectAll)
      .map(option => option.value);
  
    const allSelections = [...new Set([...newRecipients, ...regularSelections])];
    
    setRecipients(allSelections);
  };
  
  const showAlert = (message: string, type: "success" | "error" | "warning" | "info" = "error") => {
    
    Swal.fire({
      title: type.charAt(0).toUpperCase() + type.slice(1),
      text: message,
      icon: type,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
  };

  const handleSubmit = async () => {
    if (!subject || recipients.length === 0 || !deadline || !remarks) {
      showAlert("Please fill in all fields before sending", "warning");
      return;
    }

    if (deadlineError) {
      showAlert("Please fix the deadline error before sending", "warning");
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        showAlert("You must be logged in to send One Shot Reprots/Communications", "error");
        return;
      }

      const communicationData = {
        subject,
         outcomeArea: outcomeArea?.value || "",
        recipients,
        deadline: new Date(deadline),
        remarks,
        submissionLink: submissionLink || null,
        monitoringLink: monitoringLink || null,
        imageUrl: imageUrl || null,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      };

      if (isEditing && editingId) {
        await updateDoc(doc(db, "communications", editingId), communicationData);
        showAlert("Communication updated successfully!", "success");
      } else {
        await addDoc(collection(db, "communications"), communicationData);
        showAlert("Communication sent successfully!", "success");
      }

      // Reset form
      setSubject("");
      setOutcomeArea(null);
      setRecipients([]);
      setDeadline("");
      setRemarks("");
      setSubmissionLink("");
      setMonitoringLink("");
      setImageUrl("");
      setSelectedFile(null);
      setIsEditing(false);
      setEditingId(null);
      setShowDetails(false);

      // Refresh the list
      fetchSentCommunications();
    } catch (error) {
      console.error("Error sending one shot report/communication:", error);
      showAlert("Failed to send one shot report/communication. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to delete this communication?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, keep it',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const commDoc = doc(db, "communications", id);
          const snapshot = await getDoc(commDoc);
          const data = snapshot.exists() ? { id, ...snapshot.data() } : null;
      
          if (data) {
            await softDelete(data, "communications", "deleted_communications");
            await deleteDoc(commDoc);
            showAlert("Communication Deleted and Archived successfully!", "success");
            fetchSentCommunications();
          } else {
            showAlert("Communication not found!", "error");
          }
        } catch (error) {
          console.error("Error deleting communication:", error);
          showAlert("Failed to delete communication. Please try again.", "error");
        }
      }
    });
  };    
  
  const handleEdit = (comm: Communication) => {
    setSubject(comm.subject);
    setRecipients(comm.recipients);
    setDeadline(new Date(comm.deadline.seconds * 1000).toISOString().slice(0, 16));
    setRemarks(comm.remarks);
    setSubmissionLink(comm.submissionLink || "");
    setMonitoringLink(comm.monitoringLink || "");
    setImageUrl(comm.imageUrl || "");
    setSelectedFile(null);
    setEditingId(comm.id);
    setIsEditing(true);
    setShowDetails(true);
  };

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDeadline(value);
  
    if (!value) {
      setDeadlineError(null);
      return;
    }
  
    const currentDateTime = new Date();
    const selectedDateTime = new Date(value);
  
    if (selectedDateTime <= currentDateTime) {
      setDeadlineError("Deadline must be in the future (date and time)");
    } else {
      setDeadlineError(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return "✔️";
      case "error": return "❌";
      case "warning": return "⚠️";
      case "info": return "ℹ️";
      default: return "ℹ️";
    }
  };  

  const fetchRecipientDetails = async (userId: string) => {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      setRecipientDetails({
        id: userDoc.id,
        fullName: `${userDoc.data().fname} ${userDoc.data().mname || ""} ${userDoc.data().lname}`,
        email: userDoc.data().email,
      });
    }
  };

  // Keyboard shortcut for closing modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDetails) {
        setShowDetails(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDetails]);

  return (
    <div className="dashboard-container">
      <button
        className="btn-toggle btn btn-primary btn-md w-40 sticky-btn"
        onClick={() => setShowDetails(!showDetails)}
      >
        <i className={`bx ${showDetails ? "bxs-minus-circle" : "bxs-plus-circle"} bx-tada-hover`}></i>
        <span className="text">{showDetails ? "Hide" : "Create New One Shot Report/Communication"}</span>
      </button>
    
      {showFileModal && (
        <div className="overlay">
          <div className="modal-container" style={{ maxWidth: "90vw", maxHeight: "90vh" }}>
            <button className="close-btn" onClick={() => setShowFileModal(false)}>
              ✖
            </button>
            <div className="modal-body" style={{ overflow: 'auto' }}>
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
                    className="btn btn-outline-primary"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDetails && (
        <div className="overlay">
          <div className="modal-container" style={{overflow: 'auto'}}>
            <div className="container">
              <div className="row">
                <div className="col-md-12 mb-3">
                  <label>Subject:</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Enter subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <div className="form-floating mb-3">
                    <OutcomeAreaDropdown
                      value={outcomeArea}
                      onChange={(selected) => setOutcomeArea(selected)}
                    />
                  </div>
                </div>
                
                <div className="col-md-12 mb-3">
                  <label className="form-label">Upload File (image, docx, ppt, pdf, etc.):</label>
                  <input 
                    type="file" 
                    accept=".png,.jpg,.jpeg,.gif,.bmp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    className="form-control" 
                    onChange={handleFileChange}
                  />
                  {selectedFile && (
                    <div className="mt-2">
                      <span>Selected file: {selectedFile.name}</span>
                    </div>
                  )}
                  {imageUrl && (
                    <div className="mt-2">
                      <a href={imageUrl} target="_blank" rel="noopener noreferrer">View Current Attachment</a>
                    </div>
                  )}
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label" aria-required>Recipients:</label>
                  <Select
                    options={groupedOptions}
                    isMulti
                    value={groupedOptions.flatMap(group => group.options).filter((option) => {
                      if (recipients.includes(option.value)) return true;
                      if ('isSelectAll' in option && option.isSelectAll && option.role) {
                        const usersInRole = users.filter(user => user.role === option.role);
                        return usersInRole.every(user => recipients.includes(user.id));
                      }
                      return false;
                    })}
                    onChange={handleRecipientChange}
                    className="basic-multi-select"
                    classNamePrefix="select"
                    placeholder="Select recipients by role..."
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    isClearable={false}
                    backspaceRemovesValue={true}
                    escapeClearsValue={false}
                    getOptionLabel={(option) => {
                      if ('isSelectAll' in option && option.isSelectAll && option.role) {
                        const usersInRole = users.filter(u => u.role === option.role);
                        const allSelected = usersInRole.every(u => recipients.includes(u.id));
                        const someSelected = usersInRole.some(u => recipients.includes(u.id));
                        
                        return allSelected 
                          ? `✓ All ${option.role} selected` 
                          : someSelected
                            ? `↻ ${usersInRole.filter(u => recipients.includes(u.id)).length}/${usersInRole.length} ${option.role} selected`
                            : `Select all ${option.role}`;
                      }
                      return option.label;
                    }}
                    formatGroupLabel={(group) => (
                      <div className="d-flex justify-content-between">
                        <span>{group.label}</span>
                        <span className="badge bg-primary rounded-pill">
                          {group.options.length - 1}
                        </span>
                      </div>
                    )}
                  />
                  
                  <div className="selected-recipients-summary mt-2">
                    <small>
                      Selected: {recipients.length} recipients | 
                      {Object.entries(
                        recipients.reduce((acc, id) => {
                          const user = users.find(u => u.id === id);
                          const role = user?.role || 'No Role';
                          acc[role] = (acc[role] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([role, count]) => (
                        <span key={role} className="badge bg-secondary ms-2">
                          {role}: {count}
                        </span>
                      ))}
                    </small>
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Deadline:</label>
                  <input
                    type="datetime-local"
                    className={`form-control form-control-sm ${deadlineError ? 'is-invalid' : ''}`}
                    value={deadline}
                    onChange={handleDeadlineChange}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {deadlineError && (
                    <div className="invalid-feedback">{deadlineError}</div>
                  )}
                </div>                
                <div className="col-md-12 mb-3">
                  <label>Submission Link (https only):</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://example.com/submission"
                    value={submissionLink}
                    onChange={(e) => setSubmissionLink(e.target.value)}
                  />
                </div>

                <div className="col-md-12 mb-3">
                  <label>Monitoring Link (https only):</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://example.com/monitoring"
                    value={monitoringLink}
                    onChange={(e) => setMonitoringLink(e.target.value)}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-12 mb-3">
                  <label className="form-label">Remarks/Comments:</label>
                  <textarea
                    placeholder="Enter remarks or comments"
                    value={remarks}
                    className="form-control form-control-sm"
                    onChange={(e) => setRemarks(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="row">
                <div className="col-md-12 text-center">
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn btn-primary btn-lg"
                  >
                    <i className="bx bxs-send bx-tada-hover"></i>
                    <span className="text">{loading ? "Sending..." : "Send"}</span>
                  </button>
                </div>
              </div>

              <button className="close-btn" onClick={() => setShowDetails(false)}>
                ✖
              </button>
            </div>
          </div>
        </div>
      )}

      {recipientDetails && (
        <div className="overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h4>Recipient Details</h4>
                <button className="close-btn" onClick={() => setRecipientDetails(null)}>✖</button>
            </div>
            <div className="modal-body">
              <p><strong>Full Name:</strong> {recipientDetails.fullName}</p>
              <p><strong>Email:</strong> {recipientDetails.email}</p>
            </div>
          </div>
        </div>
      )}
    
      <main>
        <div className="head-title">
          <div className="left">
            <h2>Communication/One Shot Reports Management</h2>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/">Dashboard</Link>
                </li>
                <li className="breadcrumb-item active">One Shot Report and Communication Management</li>
              </ol>
            </nav>
          </div>
        </div>
        
        {alert && (
          <div 
            key={alert.id}
            className={`alert-notification alert-${alert.type}`}
            style={{
              animation: 'slideIn 0.3s forwards',
              ...(alert.type === "success"
                ? { backgroundColor: "#d4edda", color: "#155724" }
                : alert.type === "error"
                ? { backgroundColor: "#f8d7da", color: "#721c24" }
                : alert.type === "warning"
                ? { backgroundColor: "#fff3cd", color: "#856404" }
                : { backgroundColor: "#d1ecf1", color: "#0c5460" })
            }}
          >
            <span style={{ marginRight: '10px', fontSize: '20px' }}>
              {getIcon(alert.type)}
            </span>
            <span>{alert.message}</span>
            <button 
              onClick={() => setAlert(null)}
              style={{
                marginLeft: '15px',
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: 'inherit'
              }}
            >
              ×
            </button>
          </div>
        )}

        <div className="inbox-controls mb-3 d-flex align-items-center gap-3">
          <label htmlFor="searchInput" className="form-label mb-0">Search:</label>
          <input
            id="searchInput"
            type="text"
            placeholder="Search by subject or remarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control w-50"
          />

          <label htmlFor="sortSelect" className="form-label mb-0">Sort By:</label>
          <select
            id="sortSelect"
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="form-select w-auto"
          >
            <option value="createdAt">Created Date</option>
            <option value="subject">Subject</option>
            <option value="deadline">Deadline</option>
          </select>

          <label htmlFor="orderSelect" className="form-label mb-0">Order:</label>
          <select
            id="orderSelect"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            className="form-select w-auto"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>

        <h4>Sent One Shot Reports/Communications</h4>
        {filteredCommunications.length === 0 ? (
          <p>No sent communications found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Attachment</th>
                <th>Subject</th>
                <th>Recipients</th>
                <th>Deadline</th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommunications.map((comm) => (
                <tr key={comm.id}>
                  <td>
                    {comm.imageUrl ? (
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentFileUrl(comm.imageUrl || "");
                          setShowFileModal(true);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        {comm.imageUrl.match(/\.(jpeg|jpg|gif|png|bmp)$/) ? (
                          <img
                            src={comm.imageUrl}
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
                  <td>{comm.subject}</td>
                  <td>
                    {comm.recipients.map((userId: string, idx: number) => {
                      const user = users.find((user) => user.id === userId);
                      return (
                        <span
                          key={idx}
                          onClick={() => fetchRecipientDetails(userId)}
                          style={{ cursor: "pointer" }}
                          className="recipient-name"
                        >
                          {user ? user.fullName : "Unknown User"}
                          {idx < comm.recipients.length - 1 && ", "}
                        </span>
                      );
                    })}
                  </td>
                  <td>
                    {(() => {
                      const date = new Date(comm.deadline.seconds * 1000);
                      const datePart = date.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      });
                      const timePart = date.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      });
                      return `${datePart} at ${timePart}`;
                    })()}
                  </td>

                  <td>{comm.remarks}</td>
                  <td>
                    <button 
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={() => handleEdit(comm)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-danger"  
                      onClick={() => handleDelete(comm.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
};

export default Communication;