import { getAuth } from "firebase/auth";
import React, { useState, useEffect } from "react";
import Select, { ActionMeta, MultiValue } from "react-select";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs, 
} from "firebase/firestore";
import { db } from "../firebase";
import "../styles/components/dashboard.css";
import { generateProgramLinks } from "./modules/program-modules/generateProgramLinks";
import { createProgramSubmissions } from "./modules/program-modules/createProgramSubmissions";

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface FrequencyDetails {
  dailyTime?: string;
  weeklyDay?: string;
  monthlyDay?: string;
  quarter?: string;
  quarterDay?: string;
  yearlyMonth?: string;
  yearlyDay?: string;
}

const CreatePrograms: React.FC = () => {
  // All state variables remain the same
  const [programName, setProgramName] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [duration, setDuration] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [alert, setAlert] = useState<{ message: string; type: string } | null>(null);
  const [dailyTime, setDailyTime] = useState("");
  const [weeklyDay, setWeeklyDay] = useState("");
  const [monthlyDay, setMonthlyDay] = useState("");
  const [yearlyMonth, setYearlyMonth] = useState("");
  const [yearlyDay, setYearlyDay] = useState("");
  const [quarter, setQuarter] = useState("");
  const [quarterDay, setQuarterDay] = useState("");
  const [frequency, setFrequency] = useState("");
  const [, setFrequencyDetails] = useState<FrequencyDetails>({});
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // All functions remain the same
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
          email: data.email || "", 
          role: data.role || "No Role" 
        };
      });

      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      showAlert("Failed to load users", "error");
    }
  };

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

  const handleParticipantChange = (
    newValue: MultiValue<{ value: string; label: string; isSelectAll?: boolean; role?: string }>,
    actionMeta: ActionMeta<{ value: string; label: string; isSelectAll?: boolean; role?: string }>
  ) => {
    if (actionMeta.action === 'remove-value' || 
        actionMeta.action === 'pop-value' ||
        actionMeta.action === 'deselect-option') {
      const removedValue = actionMeta.removedValue || actionMeta.option;
      
      if (!removedValue) return;
      
      if (!removedValue.isSelectAll) {
        setParticipants(prev => prev.filter(id => id !== removedValue.value));
        return;
      }
      
      if (removedValue.isSelectAll && removedValue.role) {
        const usersInRole = users
          .filter(user => user.role === removedValue.role)
          .map(user => user.id);
        setParticipants(prev => prev.filter(id => !usersInRole.includes(id)));
        return;
      }
    }
    
    const selectedOptions = newValue;
    let newParticipants = [...participants];
    
    const toggledSelectAlls = selectedOptions
      .filter(option => option.isSelectAll && option.role)
      .map(option => option.role);
  
    toggledSelectAlls.forEach(role => {
      if (!role) return;
      
      const usersInRole = users
        .filter(user => user.role === role)
        .map(user => user.id);
  
      const wasJustSelected = selectedOptions.some(
        opt => opt.isSelectAll && opt.role === role && !participants.includes(opt.value)
      );
  
      if (wasJustSelected) {
        const allCurrentlySelected = usersInRole.every(id => participants.includes(id));
        
        if (allCurrentlySelected) {
          newParticipants = newParticipants.filter(id => !usersInRole.includes(id));
        } else {
          newParticipants = newParticipants.filter(id => {
            const user = users.find(u => u.id === id);
            return user?.role !== role;
          });
          newParticipants = [...newParticipants, ...usersInRole];
        }
      }
    });
  
    const regularSelections = selectedOptions
      .filter(option => !option.isSelectAll)
      .map(option => option.value);
  
    const allSelections = [...new Set([...newParticipants, ...regularSelections])];
    
    setParticipants(allSelections);
  };

  const showAlert = (message: string, type: "success" | "error" | "warning" | "info" = "error") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 8000);
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedFrequency = e.target.value;
    setFrequency(selectedFrequency);
  
    let details: FrequencyDetails = {};
    
    switch (selectedFrequency) {
      case "Daily":
        details = { dailyTime };
        break;
      case "Weekly":
        details = { weeklyDay };
        break;
      case "Monthly":
        details = { monthlyDay };
        break;
      case "Quarterly":
        details = { quarter, quarterDay };
        break;
      case "Yearly":
        details = { yearlyMonth, yearlyDay };
        break;
      default:
        details = {};
        break;
    }
  
    setFrequencyDetails(details);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!image) return null;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', image);
    formData.append('upload_preset', 'uploads');
    formData.append("resource_type", "auto");
    formData.append("folder", `programs/${getAuth().currentUser?.uid || "default"}`);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/dr5c99td8/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Image upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      showAlert('Failed to upload image', 'error');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!programName || participants.length === 0 || !frequency || !duration.from || !duration.to) {
      showAlert("Please fill in all required fields before submitting.");
      return;
    }
  
    setLoading(true);
  
    try {
      let details: FrequencyDetails = {};
  
      switch (frequency) {
        case "Daily":
          details = { dailyTime };
          break;
        case "Weekly":
          details = { weeklyDay };
          break;
        case "Monthly":
          details = { monthlyDay };
          break;
        case "Quarterly":
          details = { quarter, quarterDay };
          break;
        case "Yearly":
          details = { yearlyMonth, yearlyDay };
          break;
        default:
          break;
      }

      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage();
      }
  
      const programRef = await addDoc(collection(db, "programs"), {
        programName,
        link,
        description,
        participants,
        frequency,
        frequencyDetails: details,
        duration,
        imageUrl,
        createdAt: serverTimestamp(),
        createdBy: getAuth().currentUser?.uid || null,
      });
      
      const occurrences = await generateProgramLinks(programRef.id, frequency, details, duration);
      await createProgramSubmissions(programRef, participants, occurrences);
      
      showAlert("Program successfully added!", "success");
      setProgramName("");
      setLink("");
      setDescription("");
      setParticipants([]);
      setDuration({ from: "", to: "" });
      setImage(null);
      setImagePreview(null);
      setFrequency("");
      setFrequencyDetails({});
    } catch (error) {
      console.error("Error adding document: ", error);
      showAlert("Something went wrong while saving the program.");
    } finally {
      setLoading(false);
    }
  };
  
  const daysOfWeek = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
  ];
  
  const getIcon = (type: string) => {
    switch (type) {
      case "success": return "✔️";
      case "error": return "❌";
      case "warning": return "⚠️";
      case "info": return "ℹ️";
      default: return "ℹ️";
    }
  };

  const getDaysInMonth = (month: number, year: number = new Date().getFullYear()): number => {
    return new Date(year, month, 0).getDate();
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <main>
      <button
        className="btn-toggle btn btn-primary btn-md w-40 sticky-btn"
        onClick={() => setShowDetails(!showDetails)}
      >
        <i className={`bx ${showDetails ? "bxs-minus-circle" : "bxs-plus-circle"} bx-tada-hover`}></i>
        <span className="text">{showDetails ? "Hide" : "Create New Program"}</span>
      </button>

      {showDetails && (
        <div className="overlay">
          <div className="modal-container" style={{ maxWidth: "90%", width: "1200px" }}>
            <div className="container-fluid p-4">
              {/* Form Header */}
              <div className="row mb-4">
                <div className="col-12">
                  <h4 className="text-center">Create New Program</h4>
                  <p className="text-muted text-center small">Fill in the details to create a new program</p>
                </div>
              </div>
              
              {/* Basic Program Info Section */}
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-6">
                  <div className="form-floating mb-3">
                    <input
                      type="text"
                      id="programName"
                      className="form-control"
                      placeholder="Enter program name"
                      value={programName}
                      onChange={(e) => setProgramName(e.target.value)}
                      required
                    />
                    <label htmlFor="programName">Program Name</label>
                  </div>
                </div>
                
                <div className="col-12 col-md-6">
                  <div className="form-floating mb-3">
                    <input
                      type="text"
                      id="programLink"
                      className="form-control"
                      placeholder="Enter program link"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                    />
                    <label htmlFor="programLink">Program Link</label>
                  </div>
                </div>
                
                <div className="col-12">
                        <div className="form-floating mb-3">
                          <textarea
                            id="programDescription"
                            className="form-control"
                            placeholder="Enter program description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{ height: "120px" }}
                          ></textarea>
                          <label htmlFor="programDescription">Description</label>
                        </div>
                </div>
              </div>
              
              {/* Participants Section */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-light d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Program Participants</h5>
                      <span className="badge bg-primary">{participants.length} selected</span>
                    </div>
                    <div className="card-body">
                      <label className="form-label">Select Participants:</label>
                      <Select
                        options={groupedOptions}
                        isMulti
                        value={groupedOptions.flatMap(group => group.options).filter((option) => {
                          if (participants.includes(option.value)) return true;
                          if ('isSelectAll' in option && option.isSelectAll && option.role) {
                            const usersInRole = users.filter(user => user.role === option.role);
                            return usersInRole.every(user => participants.includes(user.id));
                          }
                          return false;
                        })}
                        onChange={handleParticipantChange}
                        className="basic-multi-select"
                        classNamePrefix="select"
                        placeholder="Select participants by role..."
                        closeMenuOnSelect={false}
                        hideSelectedOptions={false}
                        isClearable={false}
                        backspaceRemovesValue={true}
                        escapeClearsValue={false}
                        getOptionLabel={(option) => {
                          if ('isSelectAll' in option && option.isSelectAll && option.role) {
                            const usersInRole = users.filter(u => u.role === option.role);
                            const allSelected = usersInRole.every(u => participants.includes(u.id));
                            const someSelected = usersInRole.some(u => participants.includes(u.id));
                            
                            return allSelected 
                              ? `✓ All ${option.role} selected` 
                              : someSelected
                                ? `↻ ${usersInRole.filter(u => participants.includes(u.id)).length}/${usersInRole.length} ${option.role} selected`
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
                      
                      <div className="selected-participants-summary mt-2 overflow-auto" style={{ maxHeight: "100px" }}>
                        <small>
                          Selected: {participants.length} participants | 
                          {Object.entries(
                            participants.reduce((acc, id) => {
                              const user = users.find(u => u.id === id);
                              const role = user?.role || 'No Role';
                              acc[role] = (acc[role] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([role, count]) => (
                            <span key={role} className="badge bg-secondary ms-2 me-1 mb-1">
                              {role}: {count}
                            </span>
                          ))}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Image Upload Section */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">Program Image</h5>
                    </div>
                    <div className="card-body">
                      <div className="row align-items-center">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="programImage" className="form-label">Upload Image:</label>
                            <input
                              type="file"
                              id="programImage"
                              className="form-control"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                            {isUploading && (
                              <div className="progress mt-2">
                                <div 
                                  className="progress-bar" 
                                  role="progressbar" 
                                  style={{ width: `${uploadProgress}%` }}
                                  aria-valuenow={uploadProgress}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                >
                                  {uploadProgress}%
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6 text-center">
                          {imagePreview ? (
                            <div className="mb-3">
                              <img 
                                src={imagePreview} 
                                alt="Preview" 
                                className="img-thumbnail shadow-sm" 
                                style={{ maxWidth: '150px', maxHeight: '150px' }}
                              />
                              <button 
                                className="btn btn-sm btn-outline-danger ms-2"
                                onClick={() => {
                                  setImage(null);
                                  setImagePreview(null);
                                }}
                              >
                                <i className="bx bx-trash"></i> Remove
                              </button>
                            </div>
                          ) : (
                            <div className="border rounded p-4 d-flex align-items-center justify-content-center" style={{ height: "150px" }}>
                              <div className="text-muted">
                                <i className="bx bx-image bx-lg"></i>
                                <p className="small">Preview will appear here</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Frequency and Duration Section */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">Schedule Details</h5>
                    </div>
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">Frequency</label>
                            <select
                              className="form-select"
                              value={frequency}
                              onChange={handleFrequencyChange}
                              required
                            >
                              <option value="">Select Frequency</option>
                              <option value="Yearly">Yearly</option>
                              <option value="Quarterly">Quarterly</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Weekly">Weekly</option>
                              <option value="Daily">Daily</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">Duration</label>
                            <div className="d-flex gap-2">
                              <input
                                type="date"
                                className="form-control"
                                value={duration.from}
                                onChange={(e) => setDuration({ ...duration, from: e.target.value })}
                                required
                              />
                              <span className="align-self-center">to</span>
                              <input
                                type="date"
                                className="form-control"
                                value={duration.to}
                                onChange={(e) => setDuration({ ...duration, to: e.target.value })}
                                required
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Frequency Details */}
                        {frequency && (
                          <div className="col-12">
                            <div className="card bg-light">
                              <div className="card-body p-3">
                                <h6 className="mb-3">Frequency Details - {frequency}</h6>
                                
                                {frequency === "Yearly" && (
                                  <div className="row g-2">
                                    <div className="col-sm-6">
                                      <label className="form-label">Month:</label>
                                      <select
                                        className="form-select"
                                        value={yearlyMonth}
                                        onChange={(e) => {
                                          setYearlyMonth(e.target.value);
                                          setYearlyDay("");
                                        }}
                                        required
                                      >
                                        <option value="">Select Month</option>
                                        {Array.from({ length: 12 }, (_, i) => (
                                          <option key={i + 1} value={i + 1}>
                                            {new Date(0, i).toLocaleString("default", { month: "long" })}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="col-sm-6">
                                      <label className="form-label">Day:</label>
                                      <select
                                        className="form-select"
                                        value={yearlyDay}
                                        onChange={(e) => setYearlyDay(e.target.value)}
                                        disabled={!yearlyMonth}
                                        required
                                      >
                                        <option value="">Select Day</option>
                                        {yearlyMonth &&
                                        Array.from({ length: getDaysInMonth(Number(yearlyMonth)) }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>
                                              {i + 1}
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {frequency === "Quarterly" && (
                                  <div className="row g-2">
                                    <div className="col-sm-6">
                                      <label className="form-label">Quarter:</label>
                                      <select
                                        className="form-select"
                                        value={quarter}
                                        onChange={(e) => {
                                          setQuarter(e.target.value);
                                          setQuarterDay("");
                                        }}
                                        required
                                      >
                                        <option value="">Select Quarter</option>
                                        <option value="1">Q1 (Jan–Mar)</option>
                                        <option value="2">Q2 (Apr–Jun)</option>
                                        <option value="3">Q3 (Jul–Sep)</option>
                                        <option value="4">Q4 (Oct–Dec)</option>
                                      </select>
                                    </div>
                                    <div className="col-sm-6">
                                      <label className="form-label">Day:</label>
                                      <select
                                        className="form-select"
                                        value={quarterDay}
                                        onChange={(e) => setQuarterDay(e.target.value)}
                                        disabled={!quarter}
                                        required
                                      >
                                        <option value="">Select Day</option>
                                        {quarter &&
                                          Array.from({ length: getDaysInMonth(Number(quarter) * 3 - 2) }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>
                                              {i + 1}
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {frequency === "Monthly" && (
                                  <div className="row">
                                    <div className="col-sm-6">
                                      <label className="form-label">Day of the month:</label>
                                      <select
                                        className="form-select"
                                        value={monthlyDay}
                                        onChange={(e) => setMonthlyDay(e.target.value)}
                                        required
                                      >
                                        <option value="">Select Day</option>
                                        {Array.from({ length: getDaysInMonth(new Date().getMonth() + 1) }, (_, i) => (
                                          <option key={i + 1} value={i + 1}>
                                            {i + 1}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                )}
                                
                                {frequency === "Weekly" && (
                                  <div className="row">
                                    <div className="col-sm-6">
                                      <label className="form-label">Day of the week:</label>
                                      <select
                                        className="form-select"
                                        value={weeklyDay}
                                        onChange={(e) => setWeeklyDay(e.target.value)}
                                        required
                                      >
                                        <option value="">Select Day</option>
                                        {daysOfWeek.map((day) => (
                                          <option key={day} value={day}>
                                            {day}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                )}
                                
                                {frequency === "Daily" && (
                                  <div className="row">
                                    <div className="col-sm-6">
                                      <label className="form-label">Time of day:</label>
                                      <input
                                        type="time"
                                        className="form-control"
                                        value={dailyTime}
                                        onChange={(e) => setDailyTime(e.target.value)}
                                        required
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="row mb-4">
                <div className="col-12 text-center">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || isUploading}
                    className="btn btn-primary btn-lg px-5"
                  >
                    <i className="bx bxs-send me-2"></i>
                    {loading ? "Creating..." : 
                     isUploading ? "Uploading..." : 
                     "Create Program"}
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button 
                className="btn-close position-absolute top-0 end-0 m-3" 
                onClick={() => setShowDetails(false)}
                aria-label="Close"
              ></button>
              
              {/* Add CSS for responsive modal */}
              <style>{`
                .modal-container {
                  background: white;
                  border-radius: 8px;
                  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                  margin: 30px auto;
                  overflow-y: auto;
                  max-height: 90vh;
                }
                
                .overlay {
                  background: rgba(0,0,0,0.5);
                  position: fixed;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  z-index: 1000;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow-y: auto;
                  padding: 20px;
                }
                
                @media (max-width: 768px) {
                  .modal-container {
                    width: 95% !important;
                    margin: 10px auto;
                    padding: 10px;
                  }
                }
              `}</style>
            </div>
          </div>
        </div>
      )}

      {alert && (
        <div className={`custom-alert alert-${alert.type} shadow-sm`} style={{ zIndex: 2000 }}>
          <span className="alert-icon">{getIcon(alert.type)}</span>
          <span>{alert.message}</span>
          <button className="btn-close ms-3" onClick={() => setAlert(null)}></button>
        </div>
      )}
    </main>
  );
};

export default CreatePrograms;