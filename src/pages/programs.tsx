import { getAuth } from "firebase/auth"; // Import Firebase auth
import React, { useState, useEffect } from "react";
import Select from "react-select";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase"; // Ensure correct Firebase import
import "../styles/components/dashboard.css"; // Ensure you have the corresponding CSS file

const Programs: React.FC = () => {
  const [programName, setProgramName] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [showDetails, setShowDetails] = useState(false);


  const [participants, setParticipants] = useState<string[]>([]);
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([]);
  const [alert, setAlert] = useState<{ message: string; type: string } | null>(null);
  const [yearlyDate, setYearlyDate] = useState("");
const [monthlyDate, setMonthlyDate] = useState("");
const [weeklyDay, setWeeklyDay] = useState("");
const [dailyTime, setDailyTime] = useState("");


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

  const handleSubmit = async () => {
    if (!programName || participants.length === 0 || !frequency || !duration.from || !duration.to) {
      showAlert("Please fill in all fields before submitting.");
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        showAlert("You must be logged in to create a program");
        setLoading(false);
        return;
      }

      const programRef = collection(db, "programs");
      await addDoc(programRef, {
        programName,
        link,
        description,
        createdBy: user.uid,
        participants,
        frequency,
        duration,
        submitID: [],
        createdAt: serverTimestamp(),
        yearlyDate,
        monthlyDate,
        weeklyDay,
        dailyTime,
      });
      

      showAlert("Program created successfully!", "success");
      setProgramName("");
      setLink("");
      setDescription("");
      setParticipants([]);
      setFrequency("");
      setDuration({ from: "", to: "" });
    } catch (error) {
      console.error("Error creating program:", error);
      showAlert("Failed to create program. Please try again!");
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

  return (
    <div className="dashboard-container">
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

                  
                </div>
                
                <div className="col-md-12 mb-3"> 
                <div className="mb-3">
  <label className="form-label">Frequency</label>
  <select
    className="form-select"
    value={frequency}
    onChange={(e) => setFrequency(e.target.value)}
  >
    <option value="">Select Frequency</option>
    <option value="Yearly">Yearly</option>
    <option value="Quarterly">Quarterly</option>
    <option value="Monthly">Monthly</option>
    <option value="Weekly">Weekly</option>
    <option value="Daily">Daily</option>
  </select>
</div>
{(frequency === "Yearly" || frequency === "Quarterly") && (
  <div className="mb-3">
    <label className="form-label">What date?</label>
    <input
      type="date"
      className="form-control"
      value={yearlyDate}
      onChange={(e) => setYearlyDate(e.target.value)}
    />
  </div>
)}

{frequency === "Monthly" && (
  <div className="mb-3">
    <label className="form-label">What date each month?</label>
    <input
      type="date"
      className="form-control"
      value={monthlyDate}
      onChange={(e) => setMonthlyDate(e.target.value)}
    />
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
                    disabled={loading}
                    className="btn btn-primary btn-lg"
                  >
                    <i className="bx bxs-send bx-tada-hover"></i>
                    <span className="text">{loading ? "Creating..." : "Create Program"}</span>
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
    </div>
  );
};

export default Programs;
