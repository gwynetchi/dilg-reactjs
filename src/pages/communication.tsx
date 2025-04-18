import { getAuth } from "firebase/auth"; // Import Firebase auth
import React, { useState, useEffect } from "react";
import Select, { MultiValue } from "react-select";
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

import { db } from "../firebase"; // Ensure correct Firebase import
import "../styles/components/dashboard.css"; // Ensure you have the corresponding CSS file

const Communication: React.FC = () => {
  const [subject, setSubject] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]); // Store userIds
  const [deadline, setDeadline] = useState("");
  const [remarks, setRemarks] = useState("");
  const [inputLink, setInputLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [alert, setAlert] = useState<{ message: string; type: string } | null>(null);
  const [sentCommunications, setSentCommunications] = useState<any[]>([]); // New state for sent communications
  const [showDetails, setShowDetails] = useState(false);
  const [recipientDetails, setRecipientDetails] = useState<{ id: string; fullName: string; email: string } | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  
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

        return { id: doc.id, fullName, email: data.email };
      });

      setUsers(usersList);
      console.log("Final User List:", usersList);
    } catch (error) {
      console.error("Error fetching users:", error instanceof Error ? error.message : error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "uploads"); // Replace with your actual upload preset
    const auth = getAuth();
    const user = auth.currentUser;
    formData.append("folder", `communications/${user?.uid}`);
    
    try {
      const response = await fetch("https://api.cloudinary.com/v1_1/dr5c99td8/image/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Upload error:", errorData);
        throw new Error("Image upload failed.");
      }
  
      const data = await response.json();
      setImageUrl(data.secure_url); // ✅ Set image URL
      showAlert("Image uploaded successfully!", "success");
    } catch (error) {
      console.error("Error uploading image:", error);
      showAlert("Image upload failed.", "error");
    }
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
    fetchUsers();
    fetchSentCommunications(); // Fetch sent communications on mount
  }, []);

  const options: { value: string; label: string }[] = users.map((user) => ({
    value: user.id,
    label: user.fullName,
  }));

  const handleRecipientChange = (
    selectedOptions: MultiValue<{ value: string; label: string }>
  ) => {
    // Store userIds instead of full names/emails
    setRecipients(selectedOptions.map((option) => option.value));
  };

  const showAlert = (message: string, type: "success" | "error" | "warning" | "info" = "error") => {
    setAlert({ message, type });
  
    setTimeout(() => setAlert(null), 8000); // Hide after 5 seconds
  };  

  const handleSubmit = async () => {
    if (!subject || recipients.length === 0 || !deadline || !remarks) {
      showAlert("Please fill in all fields before sending");
      return;
    }
  
    const currentDate = new Date();
    const deadlineDate = new Date(deadline);
  
    if (deadlineDate < currentDate) {
      showAlert("Invalid Date: The deadline cannot be in the past");
      return;
    }
  
    if (inputLink && !inputLink.startsWith("https://")) {
      showAlert("Only HTTPS links are allowed!");
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
  
      if (isEditing && editingId) {
        // Update existing communication
        const docRef = doc(db, "communications", editingId);
        await updateDoc(docRef, {
          subject,
          recipients,
          deadline: new Date(deadline),
          remarks,
          imageUrl,
          link: inputLink,
        }
      );
      
        showAlert("Communication updated successfully!", "success");
      } else {
        // Create new communication
        const communicationRef = collection(db, "communications");
        await addDoc(communicationRef, {
          subject,
          recipients,
          deadline: new Date(deadline),
          remarks,
          link: inputLink,
          createdBy: user.uid,
          imageUrl,
          createdAt: serverTimestamp(),
          submitID: [],
        });
        showAlert("Message Sent Successfully!", "success");
      }
const newDoc: any = {
  subject,
  recipients,
  deadline: new Date(deadline),
  remarks,
  link: inputLink,
  createdBy: user.uid,
  createdAt: serverTimestamp(),
  submitID: [],
};

if (imageUrl) {
  newDoc.imageUrl = imageUrl;
}
  
      // Reset form
      setSubject("");
      setRecipients([]);
      setDeadline("");
      setRemarks("");
      setInputLink("");
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
    setDeadline(new Date(comm.deadline.seconds * 1000).toISOString().slice(0, 16)); // for datetime-local
    setRemarks(comm.remarks);
    setInputLink(comm.link || "");
    setEditingId(comm.id);
    setIsEditing(true);
    setShowDetails(true);
  };

  
  
const handleDelete = async (id: string) => {
  const confirmed = window.confirm("Are you sure you want to delete this communication?");
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "communications", id));
    showAlert("Communication deleted successfully!", "success");
    fetchSentCommunications(); // Refresh the list
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
  
      {/* Modal - Centered on the Screen */}
      {showDetails && (
        <div className="overlay">
          <div className="modal-container">
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
  <label className="form-label">Upload Image (optional):</label>
  <input type="file" className="form-control" onChange={handleImageUpload} />
  {imageUrl && (
    <div className="mt-2">
      <img src={imageUrl} alt="Uploaded" style={{ maxWidth: "100%", maxHeight: "200px" }} />
    </div>
  )}
</div>

                <div className="col-md-12 mb-3">
                  <label className="form-label">Recipients:</label>
                  <Select
                    options={options}
                    isMulti
                    value={options.filter((option) =>
                      recipients.includes(option.value)
                    )}
                    onChange={handleRecipientChange}
                    className="basic-multi-select "
                    classNamePrefix="select"
                    placeholder="Select recipients..."
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Deadline:</label>
                  <input
                    type="datetime-local"
                    className="form-control form-control-sm"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Attachment/Link:</label>
                  <input
                    type="text"
                    placeholder="Paste Google Drive link"
                    className="form-control form-control-sm"
                    value={inputLink}
                    onChange={(e) => setInputLink(e.target.value)}
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
            <div className={`custom-alert alert-${alert.type}`}>
              <span className="alert-icon">{getIcon(alert.type)}</span>
              <span>{alert.message}</span>
            </div>
          )}
  
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
                {sentCommunications.map((comm) => (
                  <tr key={comm.id}>
                    <td>
                    {comm.imageUrl ? (
                      <a href={comm.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={comm.imageUrl} alt="attachment" style={{ width: "80px" }} />
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
