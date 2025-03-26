import { getAuth } from "firebase/auth"; // Import Firebase auth
import React, { useState, useEffect } from "react";
import Select, { MultiValue } from "react-select";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase"; // Ensure correct Firebase import
import "../styles/components/dashboard.css"; // Ensure you have the corresponding CSS file
const Communication: React.FC = () => {
  const [subject, setSubject] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [remarks, setRemarks] = useState("");
  const [inputLink, setInputLink] = useState("");
  const [previewLink, setPreviewLink] = useState("");
  const [isDriveFolder, setIsDriveFolder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([]);

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
  
        return { id: doc.id, fullName };
      });
  
      setUsers(usersList);
      console.log("Final User List:", usersList);
    } catch (error) {
      console.error("Error fetching users:", error instanceof Error ? error.message : error);
    }
  };
  

  // Ensure users' emails are fetched on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch Google Drive Link
  useEffect(() => {
    const fetchLink = async () => {
      const docRef = doc(db, "settings", "googleFile");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const savedLink = docSnap.data().link;
        setInputLink(savedLink);
        processLink(savedLink);
      }
    };
    fetchLink();
  }, []);

  // Save Link with Debounce Effect
  useEffect(() => {
    const saveLink = async () => {
      if (!inputLink.trim()) {
        await deleteDoc(doc(db, "settings", "googleFile"));
        setPreviewLink("");
        setIsDriveFolder(false);
        return;
      }

      processLink(inputLink);
      await setDoc(doc(db, "settings", "googleFile"), { link: inputLink });
    };

    const timeoutId = setTimeout(saveLink, 1000);
    return () => clearTimeout(timeoutId);
  }, [inputLink]);

  // Process Google Drive Link
  const processLink = (url: string) => {
    if (!url.trim()) {
      setPreviewLink("");
      setIsDriveFolder(false);
      return;
    }

    let modifiedLink = "";

    if (url.includes("docs.google.com/spreadsheets")) {
      modifiedLink = url.replace("/edit", "/preview");
    } else if (url.includes("docs.google.com/document")) {
      modifiedLink = url.replace("/edit", "/preview");
    } else if (url.includes("docs.google.com/forms")) {
      modifiedLink = url;
    } else if (url.includes("drive.google.com/file")) {
      modifiedLink = url.replace("/view", "/preview");
    } else if (url.includes("drive.google.com/drive/folders")) {
      modifiedLink = url;
      setIsDriveFolder(true);
    } else {
      modifiedLink = "";
      setIsDriveFolder(false);
    }

    setPreviewLink(modifiedLink);
  };
  const options: { value: string; label: string }[] = users.map((user) => ({
    value: user.id,
    label: user.fullName,
  }));
  const handleRecipientChange = (
    selectedOptions: MultiValue<{ value: string; label: string }>
  ) => {
    setRecipients(selectedOptions.map((option) => option.value));
  };

  const handleSubmit = async () => {
    if (!subject || recipients.length === 0 || !deadline || !remarks) {
      alert("Please fill in all fields before sending.");
      return;
    }

    if (inputLink && !inputLink.startsWith("https://")) {
      alert("Only HTTPS links are allowed.");
      return;
    }
    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        alert("You must be logged in to send a communication.");
        setLoading(false);
        return;
      }

      const communicationRef = collection(db, "communications");
      await addDoc(communicationRef, {
        subject,
        recipients, // Now storing only an array of strings
        deadline: new Date(deadline),
        remarks,
        link: inputLink,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      alert("Message sent successfully!");
      setSubject("");
      setRecipients([]); // Reset selection
      setDeadline("");
      setRemarks("");
      setInputLink("");
      setPreviewLink("");
      setIsDriveFolder(false);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <div className="head-title">
            <div className="left">
              <h1>Communication</h1>
              <ul className="breadcrumb">
                <li>
                  <a href="#" className="active"> Home </a>
                </li>
                <li>
                  <i className="bx bx-chevron-right"></i>
                </li>
                <li>
                  <a href="#" className="active"> Home </a>
                </li>
              </ul>
            </div>
            
          </div>

          <div className="table-data">
            <div className="order">
              <div className="head">
                <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-send btn btn-primary btn-lg w-40"
            > 
              <i className="bx bxs-send bx-tada-hover"></i>
              <span className="text">{loading ? "Sending..." : "Send"}</span>
            </button>
              </div>

              <div className="input-container">
                <div className="input-box">
                  <label>Subject:</label>
                  <input
                    type="text"
                    className="form-control form-control-sm w-50"
                    placeholder="Enter subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="input-box">
                  <label>Recipients:</label>
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

                <div className="input-box">
                  <label>Deadline:</label>
                  <input
                    type="datetime-local"
                    className="form-control form-control-sm w-50"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>

                <div className="input-box">
                  <label>Attachment/Link:</label>
                  <input
                    type="text"
                    placeholder="Paste Google Drive link"
                    className="form-control form-control-sm w-50"
                    value={inputLink}
                    onChange={(e) => setInputLink(e.target.value)} // Allow free typing
                    onBlur={() => {
                      if (inputLink && !inputLink.startsWith("https://")) {
                        alert("Only secure HTTPS links are allowed.");
                        setInputLink(""); // Clear invalid input
                      }
                    }}
                  />
                </div>
              </div>
              <div className="input-box">
                  <label>Remarks/Comments:</label>
                  <textarea
                    placeholder="Enter remarks or comments"
                    value={remarks}
                    className="form-control form-control-sm w-50"
                    onChange={(e) => setRemarks(e.target.value)}
                  ></textarea>
                </div>
              <br></br>
             
            </div>
            {previewLink && (
              <div className="google-file-preview">
                {isDriveFolder ? (
                  <p>
                    <strong>Google Drive Folder:</strong>{" "}
                    <a
                      href={previewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Folder
                    </a>
                  </p>
                ) : (
                  <iframe
                    src={previewLink}
                    width="100%"
                    height="400px"
                    style={{ border: "none" }}
                    title="Google File Preview"
                  ></iframe>
                )}
              </div>
            )}
          </div>
        </main>
      </section>
    </div>
  );
};

export default Communication;