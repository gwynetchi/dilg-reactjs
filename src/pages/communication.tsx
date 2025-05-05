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
import "../styles/components/dashboard.css";

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
  const [users, setUsers] = useState<{
    role: string; id: string; fullName: string; email: string 
  }[]>([]);
  const [alert, setAlert] = useState<{
    message: string; 
    type: string;
    id?: number;
  } | null>(null);
  const [sentCommunications, setSentCommunications] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [recipientDetails, setRecipientDetails] = useState<{ id: string; fullName: string; email: string } | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFileModal, setShowFileModal] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filteredCommunications, setFilteredCommunications] = useState<any[]>([]);

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
    setImageUrl("");
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
            };
          });
  
          sentList.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.getTime() : 0;
            const dateB = b.createdAt ? b.createdAt.getTime() : 0;
            return dateB - dateA;
          });
  
          setSentCommunications(sentList);
        } else {
          setSentCommunications([]);
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
      const aField = a[sortField];
      const bField = b[sortField];
  
      if (aField && bField) {
        const aVal = aField instanceof Date ? aField.getTime() : aField;
        const bVal = bField instanceof Date ? bField.getTime() : bField;
  
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
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
    setAlert(null);
    
    setTimeout(() => {
      const alertId = Date.now();
      setAlert({ message, type, id: alertId });
      
      const timer = setTimeout(() => {
        setAlert(prev => {
          if (prev?.id === alertId) {
            return null;
          }
          return prev;
        });
      }, 5000);
      
      return () => clearTimeout(timer);
    }, 50);
  };

  const handleSubmit = async () => {
    if (!subject || recipients.length === 0 || !deadline || !remarks) {
      showAlert("Please fill in all fields before sending");
      return;
    }
  
    const currentDateTime = new Date();
    const deadlineDateTime = new Date(deadline);

    currentDateTime.setMilliseconds(0);
    deadlineDateTime.setMilliseconds(0);

    if (deadlineDateTime <= currentDateTime) {
      showAlert("Invalid Deadline: The deadline must be in the future (including time)");
      return;
    }

    if (
      (submissionLink && !submissionLink.startsWith("https://")) ||
      (monitoringLink && !monitoringLink.startsWith("https://"))
    ) {
      showAlert("Only HTTPS links are allowed for submission and monitoring!");
      return;
    }
  
    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (!user) {
        showAlert("You must be logged in to send a communication");
        setLoading(false);
        return;
      }
  
      let uploadedFileUrl = imageUrl;
      if (selectedFile && !isEditing) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("upload_preset", "uploads");
        formData.append("resource_type", "auto");
        formData.append("folder", `communications/${user.uid}`);
  
        const response = await fetch("https://api.cloudinary.com/v1_1/dr5c99td8/auto/upload", {
          method: "POST",
          body: formData,
        });
  
        if (!response.ok) {
          throw new Error("File upload failed.");
        }
  
        const data = await response.json();
        uploadedFileUrl = data.secure_url;
      }
  
      if (isEditing && editingId) {
        const docRef = doc(db, "communications", editingId);
        await updateDoc(docRef, {
          subject,
          recipients,
          deadline: new Date(deadline),
          remarks,
          imageUrl: uploadedFileUrl,
          submissionLink,
          monitoringLink,
        });
        
        showAlert("Communication updated successfully!", "success");
      } else {
        const communicationRef = collection(db, "communications");
        await addDoc(communicationRef, {
          subject,
          recipients,
          deadline: new Date(deadline),
          remarks,
          submissionLink,
          monitoringLink,
          createdBy: user.uid,
          imageUrl: uploadedFileUrl,
          createdAt: serverTimestamp(),
          submitID: [],
        });
        
        showAlert("Message Sent Successfully!", "success");
      }
  
      setSubject("");
      setRecipients([]);
      setDeadline("");
      setRemarks("");
      setSubmissionLink("");
      setMonitoringLink("");
      setSelectedFile(null);
      setImageUrl("");
      
      setIsEditing(false);
      setEditingId(null);
  
      fetchSentCommunications();
    } catch (error) {
      console.error("Error submitting message:", error);
      showAlert("Failed to process message. Please try again!");
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = (comm: any) => {
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

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this communication?");
    if (!confirmed) return;
  
    try {
      const commDoc = doc(db, "communications", id);
      const snapshot = await getDoc(commDoc);
      
      if (!snapshot.exists()) {
        showAlert("Communication not found!", "error");
        return;
      }
  
      const data = { id, ...snapshot.data() };
      
      await softDelete(data, "communications", "deleted_communications");
      await deleteDoc(commDoc);
      
      showAlert("Communication Deleted and Archived successfully!", "success");
      fetchSentCommunications();
    } catch (error) {
      console.error("Full error details:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      showAlert(`Failed to delete communication: ${errorMessage}`, "error");
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
        <span className="text">{showDetails ? "Hide" : "Create New Communication"}</span>
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
    
      <div className="table-data">
        <div className="order">
          <div className="head"></div>
        </div>

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
      </div>

      <main>
        <div className="head-title">
          <div className="left">
            <h1>Communication</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <a href="/dashboards">Home</a>
                </li>
                <li className="breadcrumb-item active">Communication</li>
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

        <h3>Sent Communications</h3>
        {sentCommunications.length === 0 ? (
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
                          setCurrentFileUrl(comm.imageUrl);
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
                      className="btn btn-sm btn-primary me-2"
                      onClick={() => handleEdit(comm)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"  
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