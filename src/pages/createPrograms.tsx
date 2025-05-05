import { getAuth } from "firebase/auth";
import React, { useState, useEffect } from "react";
import Select from "react-select";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import "../styles/components/dashboard.css";

const CreatePrograms: React.FC = () => {
  const [programName, setProgramName] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [duration, setDuration] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([]);
  const [alert, setAlert] = useState<{ message: string; type: string } | null>(null);
  const [dailyTime, setDailyTime] = useState("");
  const [weeklyDay, setWeeklyDay] = useState("");
  const [monthlyDay, setMonthlyDay] = useState("");
  const [yearlyMonth, setYearlyMonth] = useState("");
  const [yearlyDay, setYearlyDay] = useState("");
  const [quarter, setQuarter] = useState("");
  const [quarterDay, setQuarterDay] = useState("");
  const [frequency, setFrequency] = useState("");
  const [, setFrequencyDetails] = useState({});
  // New state for image upload
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch users for participant selection
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
        const fullName = `${data.fname} ${data.mname || ""} ${data.lname}`.trim();
        return { id: doc.id, fullName };
      });

      setUsers(usersList);
      console.log("Final User List:", usersList);
    } catch (error) {
      console.error("Error fetching users:", error instanceof Error ? error.message : error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const options: { value: string; label: string }[] = users.map((user) => ({
    value: user.id,
    label: user.fullName,
  }));

  const handleParticipantChange = (selectedOptions: any) => {
    setParticipants(selectedOptions.map((option: any) => option.value));
  };

  const showAlert = (message: string, type: "success" | "error" | "warning" | "info" = "error") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 8000);
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedFrequency = e.target.value;
    console.log("Selected Frequency:", selectedFrequency);
  
    setFrequency(selectedFrequency);
  
    let details = {};
    
    switch (selectedFrequency) {
      case "daily":
        details = {
          frequency: "daily",
          time: dailyTime,
        };
        break;
      case "weekly":
        details = {
          frequency: "weekly",
          day: weeklyDay,
        };
        break;
      case "monthly":
        details = {
          frequency: "monthly",
          day: monthlyDay,
        };
        break;
      case "quarterly":
        details = {
          frequency: "quarterly",
          quarter: quarter,
          day: quarterDay,
        };
        break;
      case "yearly":
        details = {
          frequency: "yearly",
          month: yearlyMonth,
          day: yearlyDay,
        };
        break;
      default:
        details = {};
        break;
    }
  
    setFrequencyDetails(details);
    console.log("Frequency Details after update:", details);
  };

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to Cloudinary
  const uploadImage = async (): Promise<string | null> => {
    if (!image) return null;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', image);
    formData.append('upload_preset', 'uploads'); // Replace with your upload preset
    formData.append("resource_type", "auto");
    formData.append("folder", `programs/${getAuth().currentUser?.uid || "default"}`);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/dr5c99td8/image/upload`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(progress);
        }
      };

      const promise = new Promise<string | null>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            resolve(response.secure_url);
          } else {
            reject(new Error('Image upload failed'));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Image upload failed'));
        };
      });

      xhr.send(formData);
      return await promise;
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
      let frequencyDetails: any = {};
  
      switch (frequency) {
        case "Daily":
          frequencyDetails = { dailyTime };
          break;
        case "Weekly":
          frequencyDetails = { weeklyDay };
          break;
        case "Monthly":
          frequencyDetails = { monthlyDay };
          break;
        case "Quarterly":
          frequencyDetails = { quarter, quarterDay };
          break;
        case "Yearly":
          frequencyDetails = { yearlyMonth, yearlyDay };
          break;
        default:
          break;
      }

      // Upload image if one was selected
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage();
      }
  
      await addDoc(collection(db, "programs"), {
        programName,
        link,
        description,
        participants,
        frequency,
        frequencyDetails,
        duration,
        imageUrl, // Add the image URL to the document
        createdAt: serverTimestamp(),
        createdBy: getAuth().currentUser?.uid || null,
      });
  
      setAlert({ message: "Program successfully added!", type: "success" });
      // Reset form fields
      setProgramName("");
      setLink("");
      setDescription("");
      setParticipants([]);
      setDuration({ from: "", to: "" });
      setImage(null);
      setImagePreview(null);
      setFrequency("");
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
      case "success":
        return "✔️";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "ℹ️";
    }
  };

  const getDaysInMonth = (month: number, year: number = new Date().getFullYear()): number => {
    return new Date(year, month, 0).getDate();
  };

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
          <div className="modal-container">
            <div className="container">
              <div className="row">
                <div className="col-md-12 mb-3">
                  <label>Program Name:</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Enter program name"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                  />
                </div>
                <div className="col-md-12 mb-3">
                  <label className="form-label">Participants:</label>
                  <Select
                    options={options}
                    isMulti
                    value={options.filter((option) => participants.includes(option.value))}
                    onChange={handleParticipantChange}
                    className="basic-multi-select "
                    classNamePrefix="select"
                    placeholder="Select participants..."
                  />
                </div>
                <div className="col-md-12 mb-3">
                  <label>Description:</label>
                  <textarea
                    className="form-control form-control-sm"
                    placeholder="Enter program description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  ></textarea>
                </div>
                <div className="col-md-12 mb-3">
                  <label>Link:</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Enter program link"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                </div>
                <div className="col-md-12 mb-3">
                  <label>Program Image:</label>
                  <input
                    type="file"
                    className="form-control form-control-sm"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="img-thumbnail" 
                        style={{ maxWidth: '200px', maxHeight: '200px' }}
                      />
                      <button 
                        className="btn btn-sm btn-danger ms-2"
                        onClick={() => {
                          setImage(null);
                          setImagePreview(null);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
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
                
                <div className="col-md-12 mb-3"> 
                <div className="mb-3">
                  <label className="form-label">Frequency</label>
                  <select
                    className="form-select"
                    value={frequency}
                    onChange={handleFrequencyChange}
                  >
                    <option value="">Select Frequency</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Daily">Daily</option>
                  </select>
                </div>

                {frequency === "Yearly" && (
                  <div className="mb-3">
                    <label className="form-label">Select month and day:</label>
                    <div className="d-flex gap-2">
                      <select
                        className="form-select"
                        value={yearlyMonth}
                        onChange={(e) => {
                          setYearlyMonth(e.target.value);
                          setYearlyDay("");
                        }}
                      >
                        <option value="">Month</option>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(0, i).toLocaleString("default", { month: "long" })}
                          </option>
                        ))}
                      </select>

                      <select
                        className="form-select"
                        value={yearlyDay}
                        onChange={(e) => setYearlyDay(e.target.value)}
                        disabled={!yearlyMonth}
                      >
                        <option value="">Day</option>
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
                  <div className="mb-3">
                    <label className="form-label">Select quarter and day:</label>
                    <div className="d-flex gap-2">
                      <select
                        className="form-select"
                        value={quarter}
                        onChange={(e) => {
                          setQuarter(e.target.value);
                          setQuarterDay("");
                        }}
                      >
                        <option value="">Quarter</option>
                        <option value="1">Q1 (Jan–Mar)</option>
                        <option value="2">Q2 (Apr–Jun)</option>
                        <option value="3">Q3 (Jul–Sep)</option>
                        <option value="4">Q4 (Oct–Dec)</option>
                      </select>

                      <select
                        className="form-select"
                        value={quarterDay}
                        onChange={(e) => setQuarterDay(e.target.value)}
                        disabled={!quarter}
                      >
                        <option value="">Day</option>
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
                  <div className="mb-3">
                    <label className="form-label">Select day of the month:</label>
                    <select
                      className="form-select"
                      value={monthlyDay}
                      onChange={(e) => setMonthlyDay(e.target.value)}
                    >
                      <option value="">Day</option>
                      {Array.from({ length: getDaysInMonth(new Date().getMonth() + 1) }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {frequency === "Weekly" && (
                  <div className="mb-3">
                    <label className="form-label">What day of the week?</label>
                    <select
                      className="form-select"
                      value={weeklyDay}
                      onChange={(e) => setWeeklyDay(e.target.value)}
                    >
                      <option value="">Select a day</option>
                      {daysOfWeek.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {frequency === "Daily" && (
                  <div className="mb-3">
                    <label className="form-label">What time of day?</label>
                    <input
                      type="time"
                      className="form-control"
                      value={dailyTime}
                      onChange={(e) => setDailyTime(e.target.value)}
                    />
                  </div>
                )}

                  <label>Duration:</label>
                  <div className="d-flex">
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={duration.from}
                      onChange={(e) => setDuration({ ...duration, from: e.target.value })}
                    />
                    <span className="mx-2">to</span>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={duration.to}
                      onChange={(e) => setDuration({ ...duration, to: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-12 text-center">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || isUploading}
                    className="btn btn-primary btn-lg"
                  >
                    <i className="bx bxs-send bx-tada-hover"></i>
                    <span className="text">
                      {loading ? "Creating..." : 
                       isUploading ? "Uploading..." : 
                       "Create Program"}
                    </span>
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

      {alert && (
        <div className={`custom-alert alert-${alert.type}`}>
          <span className="alert-icon">{getIcon(alert.type)}</span>
          <span>{alert.message}</span>
        </div>
      )}
    </main>
  );
};

export default CreatePrograms;