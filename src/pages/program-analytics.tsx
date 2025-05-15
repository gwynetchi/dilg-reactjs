import React, { useState, useEffect } from "react";
import Select from "react-select";
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
  onSnapshot,
  arrayRemove,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Table, Modal, Button, Form } from "react-bootstrap";
import "../styles/components/pages.css";
import { Link } from "react-router-dom";


interface Submission {
  id: string;
  occurrence?: string;
  submittedBy: string;
  submittedAt?: { seconds: number };
  status?: string;
  autoStatus?: string;
  evaluatorStatus?: string;
  remark?: string;
  score?: number; // <-- NEW
  docId: string;
}


interface ChartData {
  status: string;
  autoCount: number;
  manualCount: number;
}


// Define all possible statuses
const allStatuses = ["On Time", "Late", "Incomplete", "No Submission", "For Revision"];

// Define colors for each status
const statusColors: Record<string, string> = {
  "On Time": "#28a745",
  "Late": "#dc3545",
  "Incomplete": "#ffc107",
  "No Submission": "#6c757d",
  "For Revision": "#17a2b8",
};

const Analytics: React.FC = () => {
const [programs, setPrograms] = useState<{ id: string; programName: string }[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({});
  const [selectedDeadline, setSelectedDeadline] = useState<string | null>(null);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [showRemarkModal, setShowRemarkModal] = useState(false);
const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);
const [remarkText, setRemarkText] = useState("");


useEffect(() => {
  const unsubscribe = onSnapshot(collection(db, "programs"), (snapshot) => {
    const fetchedPrograms = snapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, programName: data.programName };
    });

    setPrograms(fetchedPrograms);
  });

  return () => unsubscribe();
}, []);


  useEffect(() => {
    if (!selectedSubject) {
      setChartData(allStatuses.map((status) => ({ status, autoCount: 0, manualCount: 0 })));
      return;
    }
  
    const statusCount: Record<string, { autoCount: number; manualCount: number }> = {};
  
    // Initialize all statuses with 0
    allStatuses.forEach((status) => {
      statusCount[status] = { autoCount: 0, manualCount: 0 };
    });
  
    // If there are no submissions for this communication, mark all as "No Submission"
    if (!submissions[selectedSubject] || submissions[selectedSubject].length === 0) {
      statusCount["No Submission"].autoCount = 1;
    } else {
      submissions[selectedSubject].forEach((sub) => {
        const autoStatus = sub.autoStatus || "No Submission";
        const evaluatorStatus =
          sub.evaluatorStatus && sub.evaluatorStatus !== "Pending" ? sub.evaluatorStatus : "";
  
        statusCount[autoStatus].autoCount += 1;
  
        if (evaluatorStatus) {
          statusCount[evaluatorStatus].manualCount += 1;
        }
      });
    }
  
    const formattedChartData = allStatuses.map((status) => ({
      status,
      autoCount: statusCount[status].autoCount,
      manualCount: statusCount[status].manualCount,
    }));
  
    setChartData(formattedChartData);
  }, [submissions, selectedSubject]);
  
  useEffect(() => {
    // Fetch user data to map user IDs to full names
    const unsubscribe = onSnapshot(collection(db, "users"), (querySnapshot) => {
      const usersList = querySnapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        const fullName = `${data.fname} ${data.mname ? data.mname + " " : ""}${data.lname}`.trim();
        acc[doc.id] = fullName;
        return acc;
      }, {} as Record<string, string>);

      setUsers(usersList);
    });

    return () => unsubscribe();
  }, []);

useEffect(() => {
  if (!selectedSubject) {
    setSubmissions({});
    setChartData([]);
    setSelectedDeadline(null);
    return;
  }

  setLoading(true);

  const fetchProgramData = async () => {
    try {
      const programRef = doc(db, "programs", selectedSubject);
      const programSnap = await getDoc(programRef);

      if (!programSnap.exists()) {
        setLoading(false);
        return;
      }

      const programData = programSnap.data();
      const recipients = programData.participants || [];

      setSelectedDeadline(`From ${programData.duration?.from} to ${programData.duration?.to}`);

      const submissionsQuery = query(
        collection(db, "programsubmission"),
        where("programId", "==", selectedSubject)
      );

      const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
        if (snapshot.empty) {
          // No submissions at all
          const noSubmissions = recipients.map((userId: string) => ({
            id: userId,
            submittedBy: userId,
            autoStatus: "No Submission",
          }));
          setSubmissions({ [selectedSubject]: noSubmissions });
          setLoading(false);
          return;
        }

        const fetchedSubmissions: Submission[] = [];

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const allSubmissions = data.submissions || [];
          const submittedBy = data.submittedBy;

allSubmissions.forEach((entry: any) => {
  const autoStatus = entry.submitted
    ? (entry.autoStatus || "On Time")
    : "No Submission";

fetchedSubmissions.push({
  id: `${docSnap.id}_${entry.occurrence}`,
  docId: docSnap.id, // <-- keep actual Firestore doc ID
  occurrence: entry.occurrence,
  submittedBy,
  submittedAt: entry.submittedAt || null,
  status: entry.status || null,
  autoStatus,
  evaluatorStatus: entry.evaluatorStatus || "Pending",
  remark: entry.remarks || "",
});


});

        });

        const submittedUserIDs = new Set(fetchedSubmissions.map((sub) => sub.submittedBy));
        const missingRecipients = recipients
          .filter((userId: string) => !submittedUserIDs.has(userId))
          .map((userId: string) => ({
            id: userId,
            submittedBy: userId,
            autoStatus: "No Submission",
          }));

        setSubmissions({
          [selectedSubject]: [...fetchedSubmissions, ...missingRecipients],
        });

        setLoading(false);
      });

      return unsubscribe;
    } catch (err) {
      console.error("Error loading program data:", err);
      setLoading(false);
    }
  };

  fetchProgramData();
}, [selectedSubject]);


const handleStatusUpdate = async (
  userId: string,
  occurrence: string,
  newStatus: string
) => {
  try {
    // Get the user's programsubmission document
    const q = query(
      collection(db, "programsubmission"),
      where("submittedBy", "==", userId),
      where("programId", "==", selectedSubject) // assuming selectedSubject is the selected program ID
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.error("No programsubmission document found");
      return;
    }

    const docRef = snapshot.docs[0].ref;
    const data = snapshot.docs[0].data();

    // Update the matching occurrence inside the submissions array
    const updatedSubmissions = data.submissions.map((sub: any) =>
      sub.occurrence === occurrence
        ? { ...sub, evaluatorStatus: newStatus }
        : sub
    );

    await updateDoc(docRef, { submissions: updatedSubmissions });

    // Update local state
    setSubmissions((prev) => {
      if (!selectedSubject || !prev[selectedSubject]) return prev;

      return {
        ...prev,
[selectedSubject]: prev[selectedSubject].map((sub) =>
  sub.submittedBy === userId && sub.occurrence === occurrence // <-- FIXED
    ? { ...sub, evaluatorStatus: newStatus }
    : sub
),

      };
    });

    console.log(`Evaluator status updated for ${userId} - ${occurrence}`);
  } catch (error) {
    console.error("Failed to update evaluator status:", error);
    alert("Error updating evaluator status.");
  }
};

  

  return (
    <div className="dashboard-container">
    <section id="content">
      <main>
        <div className="head-title">
          <div className="left">
            <h2>Program Monitoring and Scheduled Reports</h2>
            <ul className="breadcrumb">
              <li>
                <Link to="/dashboards" className="active">Home</Link>
              </li>
              <li>
                <i className="bx bx-chevron-right"></i>
              </li>
              <li>
                <Link to="/evaluator/analytics" className="active">Analytics</Link>
              </li>
              <li>
                <i className="bx bx-chevron-right"></i>
              </li>
              <li>
                <Link to="/evaluator/analytics/submission-analytics">Program Monitoring and Scheduled Reports</Link>
              </li>
            </ul>
          </div>
        </div>
        
<Select
  options={programs.map((program) => ({
    value: program.id,
    label: program.programName,
  }))}
  onChange={(selectedOption) => setSelectedSubject(selectedOption?.value || "")}
  placeholder="Search or Select Program"
  isClearable
/>

  
        {selectedSubject && <p>Deadline: {selectedDeadline || "No Deadline"}</p>}
  
        {loading ? (
          <p>Loading data...</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              
              {/* Auto Status Bar (Lighter Color) */}
              <Bar dataKey="autoCount" name="Auto Status" barSize={40} isAnimationActive={true}>
                {chartData.map((entry, index) => (
                  <Cell key={`auto-cell-${index}`} fill={statusColors[entry.status] + "80"} /> // Lightened
                ))}
              </Bar>
          
              {/* Manual Status Bar (Darker Color) */}
              <Bar dataKey="manualCount" name="Evaluator Status" barSize={40} isAnimationActive={true}>
                {chartData.map((entry, index) => (
                  <Cell key={`manual-cell-${index}`} fill={statusColors[entry.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
  
        <h3>Evaluate Submission</h3>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Name</th>
              <th>Submitted At</th>
              <th>Auto Status</th>
              <th>Evaluator Status</th>
            </tr>
          </thead>
          <tbody>
            {selectedSubject && submissions[selectedSubject]?.length > 0 ? (
              submissions[selectedSubject].map((sub) => (
                <tr key={sub.id}>
                  <td>{users[sub.submittedBy] || "Unknown User"}</td>
                  <td>
                    {sub.submittedAt
                      ? new Date(sub.submittedAt.seconds * 1000).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",  // Use full month name (e.g., "April")
                          day: "numeric", // Numeric day
                        }) + ' ' + new Date(sub.submittedAt.seconds * 1000).toLocaleTimeString("en-US", {
                          hour: "numeric",   // Hour in 12-hour format
                          minute: "numeric", // Minute
                          hour12: true,      // Use 12-hour clock (AM/PM)
                        }).replace(/:([0-9]{2})$/, ':$1') // Prevent extra space before time
                      : "Not Submitted"}
                  </td>
                  <td>{sub.autoStatus || "No Submission"}</td>
                  <td>
                    <Select
                      menuPosition="fixed"
                      menuPlacement="auto"
                      value={allStatuses
                        .map((status) => ({ value: status, label: status, color: statusColors[status] }))
                        .find((option) => option.value === (pendingStatus[sub.id] ?? sub.evaluatorStatus ?? "Pending"))
                      }
                      options={allStatuses.map((status) => ({
                        value: status,
                        label: status,
                        color: statusColors[status],
                      }))}
                      onChange={(selectedOption) => {
                        if (!selectedOption) return;
                        setPendingStatus((prev) => ({ ...prev, [sub.id]: selectedOption.value }));
                        handleStatusUpdate(sub.submittedBy, sub.occurrence || "", selectedOption.value);

                      }}
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: "#ccc",
                          boxShadow: "none",
                        }),
                        option: (base, { data }) => ({
                          ...base,
                          backgroundColor: data.color,
                          color: "#fff",
                        }),
                        singleValue: (base, { data }) => ({
                          ...base,
                          color: data.color,
                        }),
                      }}
                    />
                    <Button
  variant="outline-primary"
  size="sm"
  onClick={() => {
    setCurrentSubmissionId(sub.id);
    setRemarkText(sub.remark || ""); // optional prefill
    setShowRemarkModal(true);
  }}
>
  Add Remark
</Button>

                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "red" }}>
                  {selectedSubject ? "No submissions found for this subject." : "Select a subject to view submissions."}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
        <Modal show={showRemarkModal} onHide={() => setShowRemarkModal(false)}>
  <Modal.Header closeButton>
    <Modal.Title>Add Remark</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form.Group>
      <Form.Label>Remark</Form.Label>
      <Form.Control
        as="textarea"
        rows={4}
        value={remarkText}
        onChange={(e) => setRemarkText(e.target.value)}
      />
    </Form.Group>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowRemarkModal(false)}>
      Cancel
    </Button>
<Button
  variant="primary"
  onClick={async () => {
    if (!currentSubmissionId) return;

const currentSubmission = submissions[selectedSubject]?.find(sub => sub.id === currentSubmissionId);

if (!currentSubmission) {
  console.error("Submission not found in state");
  return;
}

const { docId, occurrence } = currentSubmission;


    try {
      // Fetch the programsubmission document by docId
      const docRef = doc(db, "programsubmission", docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.error("Submission document not found");
        return;
      }

      const data = docSnap.data();
      const submissionsArray = data.submissions || [];

      // Update the correct submission entry by occurrence
      const updatedSubmissions = submissionsArray.map((entry: any) =>
        entry.occurrence === occurrence
          ? { ...entry, remarks: remarkText }
          : entry
      );

      // Save the updated array
      await updateDoc(docRef, { submissions: updatedSubmissions });

      // Optionally update local state
      setSubmissions((prev) => {
        if (!selectedSubject || !prev[selectedSubject]) return prev;

        return {
          ...prev,
          [selectedSubject]: prev[selectedSubject].map((sub) =>
            sub.id === currentSubmissionId
              ? { ...sub, remark: remarkText }
              : sub
          ),
        };
      });

      console.log("Remark successfully updated.");
    } catch (error) {
      console.error("Error updating remark:", error);
      alert("Failed to save remark.");
    }

    setShowRemarkModal(false);
  }}
>
  Save Remark
</Button>
  </Modal.Footer>
</Modal>

      </main>
    </section>
  </div>
  
  );
};

export default Analytics;
