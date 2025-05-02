  import { getAuth } from "firebase/auth"; // Import Firebase auth
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
  import { softDelete } from "./../pages/modules/inbox-modules/softDelete"; // <- Add this import

  import { db } from "../firebase"; // Ensure correct Firebase import
  import "../styles/components/dashboard.css"; // Ensure you have the corresponding CSS file

  const Communication: React.FC = () => {
    const [subject, setSubject] = useState("");
    const [recipients, setRecipients] = useState<string[]>([]); // Store userIds
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
        id?: number; // Add unique identifier
      } | null>(null);
    const [sentCommunications, setSentCommunications] = useState<any[]>([]); // New state for sent communications
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

    
    // Group users by roles
    const groupedOptions: {
      label: string;
      options: { value: string; label: string; isSelectAll?: boolean; role?: string }[];
    }[] = Object.entries(
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
      label: role.charAt(0).toUpperCase() + role.slice(1),
      options: [
        {
          value: `toggle_all_${role}`, // Changed from select_all to toggle_all
          label: `Select all ${role}`,
          isSelectAll: true,
          role,
        },
        ...options,
      ],
    }));
    const fetchUsers = async () => {
      try {
        console.log("Fetching users...");
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);

        if (querySnapshot.empty) {
          console.warn("No users found in Firestore.");
        }

        const usersList = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          let fullName = "";

          if (data.fname && data.lname) {
            fullName = `${data.fname} ${data.mname ? data.mname + " " : ""}${data.lname}`.trim();
          } else {
            fullName = data.email || "Unknown User"; // Default to email if full name is missing
          }

          return { id: doc.id, fullName, email: data.email, role: data.role || "No Role"  };
        });

        setUsers(usersList);
        console.log("Final User List:", usersList);
      } catch (error) {
        console.error("Error fetching users:", error instanceof Error ? error.message : error);
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
              const createdAt = data.createdAt ? data.createdAt.toDate() : null; // Convert timestamp
    
              return {
                id: doc.id,
                ...data,
                createdAt, // Add converted date
              };
            });
    
            // Sort by createdAt field (ensure it's a valid date)
            sentList.sort((a, b) => {
              const dateA = a.createdAt ? a.createdAt.getTime() : 0; // Ensure it's a timestamp
              const dateB = b.createdAt ? b.createdAt.getTime() : 0;
              return dateB - dateA;
            });
    
            setSentCommunications(sentList);
          } else {
            console.log("No sent communications found.");
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
      fetchSentCommunications(); // Fetch sent communications on mount
    }, []);
    const handleRecipientChange = (
      newValue: MultiValue<{ value: string; label: string; isSelectAll?: boolean; role?: string }>,
      actionMeta: ActionMeta<{ value: string; label: string; isSelectAll?: boolean; role?: string }>
    ) => {
      // Handle all removal cases (clicking X or clicking on selected item)
      if (actionMeta.action === 'remove-value' || 
          actionMeta.action === 'pop-value' ||
          actionMeta.action === 'deselect-option') {
        const removedValue = actionMeta.removedValue || actionMeta.option;
        
        if (!removedValue) return;
        
        // If removing a regular user
        if (!removedValue.isSelectAll) {
          setRecipients(prev => prev.filter(id => id !== removedValue.value));
          return;
        }
        
        // If removing a "Select All" option
        if (removedValue.isSelectAll && removedValue.role) {
          const usersInRole = users
            .filter(user => user.role === removedValue.role)
            .map(user => user.id);
          setRecipients(prev => prev.filter(id => !usersInRole.includes(id)));
          return;
        }
      }
      
      // Handle additions (including select/unselect all toggle)
      const selectedOptions = newValue;
      let newRecipients = [...recipients];
      
      // Check for any toggled "Select All" options
      const toggledSelectAlls = selectedOptions
        .filter(option => option.isSelectAll && option.role)
        .map(option => option.role);
    
      // Process each toggled role
      toggledSelectAlls.forEach(role => {
        if (!role) return;
        
        const usersInRole = users
          .filter(user => user.role === role)
          .map(user => user.id);
    
        // Check if this "Select All" was just clicked (added to selection)
        const wasJustSelected = selectedOptions.some(
          opt => opt.isSelectAll && opt.role === role && !recipients.includes(opt.value)
        );
    
        if (wasJustSelected) {
          // Determine if we should select or deselect all
          const allCurrentlySelected = usersInRole.every(id => recipients.includes(id));
          
          if (allCurrentlySelected) {
            // Deselect all
            newRecipients = newRecipients.filter(id => !usersInRole.includes(id));
          } else {
            // Select all - first remove existing users from this role
            newRecipients = newRecipients.filter(id => {
              const user = users.find(u => u.id === id);
              return user?.role !== role;
            });
            // Then add all users from this role
            newRecipients = [...newRecipients, ...usersInRole];
          }
        }
      });
    
      // Handle regular selections (non-select-all options)
      const regularSelections = selectedOptions
        .filter(option => !option.isSelectAll)
        .map(option => option.value);
    
      // Combine all selections
      const allSelections = [...new Set([...newRecipients, ...regularSelections])];
      
      setRecipients(allSelections);
    };
    
    const showAlert = (message: string, type: "success" | "error" | "warning" | "info" = "error") => {
      // Clear any existing alert immediately
      setAlert(null);
      
      // Use setTimeout to ensure the state is cleared before showing new alert
      setTimeout(() => {
        const alertId = Date.now();
        setAlert({ message, type, id: alertId });
        
        // Auto-dismiss after 5 seconds
        const timer = setTimeout(() => {
          setAlert(prev => {
            // Only remove if it's the same alert we set
            if (prev?.id === alertId) {
              return null;
            }
            return prev;
          });
        }, 5000);
        
        // Return cleanup function
        return () => clearTimeout(timer);
      }, 50); // Small delay to ensure clean state transition
    };
    const handleSubmit = async () => {
      if (!subject || recipients.length === 0 || !deadline || !remarks) {
        showAlert("Please fill in all fields before sending");
        return;
      }
    
    // Create Date objects for comparison
    const currentDateTime = new Date();
    const deadlineDateTime = new Date(deadline);

    // Remove milliseconds for accurate comparison
    currentDateTime.setMilliseconds(0);
    deadlineDateTime.setMilliseconds(0);

    // Compare the timestamps
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
    
        // Upload file if one was selected
        let uploadedFileUrl = imageUrl; // Use existing URL if editing
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
          // Update existing communication
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
          // Create new communication
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
    
        // Reset form
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
      setSelectedFile(null); // Clear any selected file
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
        const data = snapshot.exists() ? { id, ...snapshot.data() } : null;
    
        if (data) {
          await softDelete(data, "communications", "deleted_communications", "deletedBy");
          await deleteDoc(commDoc);
          showAlert("Communication Deleted and Archived successfully!", "success");
          fetchSentCommunications(); // Refresh the list
        } else {
          showAlert("Communication not found!", "error");
        }
      } catch (error) {
        console.error("Error deleting communication:", error);
        showAlert("Failed to delete communication. Please try again.", "error");
      }
    };
    
    const getIcon = (type: string) => {
      switch (type) {
        case "success":
          return "✔️"; // Checkmark or a success icon
        case "error":
          return "❌"; // Cross or an error icon
        case "warning":
          return "⚠️"; // Warning sign
        case "info":
          return "ℹ️"; // Info symbol
        default:
          return "ℹ️"; // Default info icon
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

    return (
      <div className="dashboard-container">
        {/* Sticky Button - Always Visible */}
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
        {/* Modal - Centered on the Screen */}
        {showDetails && (
          <div className="overlay" >
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
                        // Show regular selections
                        if (recipients.includes(option.value)) {
                          return true;
                        }
                        
                        // Show "Select all" as selected if all users in that role are selected
                        if (option.isSelectAll && option.role) {
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
                      getOptionLabel={(option) => 
                        option.isSelectAll && option.role
                          ? users.filter(u => u.role === option.role).every(u => recipients.includes(u.id))
                            ? `Unselect all ${option.role}`
                            : `Select all ${option.role}`
                          : option.label
                      }
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Deadline:</label>
                    <input
                      type="datetime-local"
                      className={`form-control form-control-sm ${deadlineError ? 'is-invalid' : ''}`}
                      value={deadline}
                      onChange={handleDeadlineChange}
                      min={new Date().toISOString().slice(0, 16)} // Set min to current datetime
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

              {/* Close Button (Keep it the same) */}
                <button className="close-btn" onClick={() => setShowDetails(false)}>
                  ✖
                </button>
              </div>
            </div>
          </div>
        )}
    
        {/* Table Data Section */}
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
    
        <section id="content">
          <main>
            <div className="head-title">
              <div className="left">
                <h1>Communication</h1>
                <ul className="breadcrumb">
                  <li>
                    <a href="/dashboards" className="active"> Home </a>
                  </li>
                  <li>
                    <i className="bx bx-chevron-right"></i>
                  </li>
                  <li>
                    <a> Communication Details </a>
                  </li>
                </ul>
              </div>
            </div>
            {alert && (
    <div 
      key={alert.id} // Add key to force re-render
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
    {/* Search Label */}
    <label htmlFor="searchInput" className="form-label mb-0">Search:</label>
    <input
      id="searchInput"
      type="text"
      placeholder="Search by subject or remarks..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="form-control w-50"
    />

    {/* Sort Label */}
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

    {/* Order Label */}
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
                        <button className="btn btn-sm btn-primary me-2"
  onClick={() => handleEdit(comm)}>
                          Edit
                        </button>
                      <button className="btn btn-sm btn-danger"  onClick={() => handleDelete(comm.id)}
                          style={{ marginLeft: "8px", backgroundColor: "#dc3545", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px" }}
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
        </section>
      </div>
    );
    
  };

  export default Communication;