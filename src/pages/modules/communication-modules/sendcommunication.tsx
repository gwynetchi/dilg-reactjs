// components/CommunicationForm.tsx
import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import Select, { MultiValue } from "react-select";
import { db } from "../../../firebase";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

const CommunicationForm: React.FC<Props> = ({ onClose, onSuccess, editData }) => {
  const [subject, setSubject] = useState(editData?.subject || "");
  const [recipients, setRecipients] = useState<string[]>(editData?.recipients || []);
  const [deadline, setDeadline] = useState(
    editData?.deadline
      ? new Date(editData.deadline.seconds * 1000).toISOString().slice(0, 16)
      : ""
  );
  const [remarks, setRemarks] = useState(editData?.remarks || "");
  const [submissionLink, setSubmissionLink] = useState(editData?.submissionLink || "");
  const [monitoringLink, setMonitoringLink] = useState(editData?.monitoringLink || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(editData?.imageUrl || "");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string; fullName: string; role: string }[]>([]);
  const [groupedOptions, setGroupedOptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          fullName: `${data.fname} ${data.mname || ""} ${data.lname}`.trim(),
          role: data.role || "No Role",
        };
      });

      setUsers(usersList);

      // Compute groupedOptions here
      const grouped = Object.entries(
        usersList.reduce((groups, user) => {
          const role = user.role || "No Role";
          if (!groups[role]) groups[role] = [];
          groups[role].push({ value: user.id, label: user.fullName });
          return groups;
        }, {} as Record<string, { value: string; label: string }[]>)
      ).map(([role, options]) => ({
        label: role.charAt(0).toUpperCase() + role.slice(1),
        options: [
          {
            value: `select_all_${role}`,
            label: `Select all ${role}`,
            isSelectAll: true,
            role,
          },
          ...options,
        ],
      }));

      setGroupedOptions(grouped);
    };

    fetchUsers();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSelectedFile(file || null);
  };

  const handleRecipientChange = (options: MultiValue<{ value: string; label: string }>) => {
    setRecipients(options.map((o) => o.value));
  };

  const handleSubmit = async () => {
    if (!subject || !deadline || !remarks || recipients.length === 0) {
      alert("Please fill in all required fields.");
      return;
    }

    const deadlineDate = new Date(deadline);
    if (deadlineDate < new Date()) {
      alert("Deadline cannot be in the past.");
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      let uploadedUrl = imageUrl;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("upload_preset", "uploads");
        formData.append("resource_type", "auto");
        formData.append("folder", `communications/${user.uid}`);

        const response = await fetch("https://api.cloudinary.com/v1_1/dr5c99td8/auto/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        uploadedUrl = data.secure_url;
      }

      if (editData) {
        await updateDoc(doc(db, "communications", editData.id), {
          subject,
          recipients,
          deadline: deadlineDate,
          remarks,
          submissionLink,
          monitoringLink,
          imageUrl: uploadedUrl,
        });
      } else {
        await addDoc(collection(db, "communications"), {
          subject,
          recipients,
          deadline: deadlineDate,
          remarks,
          submissionLink,
          monitoringLink,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          imageUrl: uploadedUrl,
          submitID: [],
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error submitting communication:", err);
      alert("Failed to submit communication.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
              <label className="form-label">Recipients:</label>
              <Select
                options={groupedOptions}
                isMulti
                value={groupedOptions.flatMap(group => group.options).filter((option) =>
                  recipients.includes(option.value)
                )}
                onChange={handleRecipientChange}
                className="basic-multi-select"
                classNamePrefix="select"
                placeholder="Select recipients by role..."
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
          <button className="close-btn" onClick={onClose}>
            ✖
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunicationForm;
