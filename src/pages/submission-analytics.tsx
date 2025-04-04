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
  documentId,
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
import { Table } from "react-bootstrap";
import "../styles/components/pages.css";
import { Link } from "react-router-dom";


interface Communication {
  id: string;
  subject: string;
  recipients: [];
  deadline?: { seconds: number };
  submitID:[];
}

interface Submission {
  id: string;
  submittedBy: string;
  submittedAt?: { seconds: number };
  status?: string;
  autoStatus?: string;
  evaluatorStatus?: string; // Keep only this field
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
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({});
  const [selectedDeadline, setSelectedDeadline] = useState<string | null>(null);
  const [users, setUsers] = useState<Record<string, string>>({});
  

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "communications"), (snapshot) => {
      const fetchedCommunications = snapshot.docs.map((doc) => {
        const data = doc.data() as Communication;
        return { ...data, id: doc.id }; // Ensures `id` is not overwritten
      });
      
      setCommunications(fetchedCommunications);
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

  const fetchCommunicationData = async () => {
    const commRef = doc(db, "communications", selectedSubject);
    const commSnap = await getDoc(commRef);
    
    if (commSnap.exists()) {
      const data = commSnap.data() as Communication;
      const deadline = data.deadline?.seconds ? data.deadline.seconds * 1000 : null;
      setSelectedDeadline(deadline ? new Date(deadline).toLocaleString() : "No Deadline");

      return { deadline, submitIDs: data.submitID || [], recipients: data.recipients || [] };
    }

    return { deadline: null, submitIDs: [], recipients: [] };
  };

  fetchCommunicationData().then(({ deadline, submitIDs, recipients }) => {
    if (!recipients.length) {
      // No recipients assigned, clear submissions
      setSubmissions({ [selectedSubject]: [] });
      setLoading(false);
      return;
    }

    if (!submitIDs.length) {
      // No submissions at all, all recipients get "No Submission"
      setSubmissions({
        [selectedSubject]: recipients.map((userId) => ({
          id: userId,
          submittedBy: userId,
          autoStatus: "No Submission",
        })),
      });
      setLoading(false);
      return;
    }

    // Fetch submitted details for given submitIDs
    const submissionsQuery = query(
      collection(db, "submittedDetails"),
      where(documentId(), "in", submitIDs)
    );

    const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
      const fetchedSubmissions = snapshot.docs.map((doc) => {
        const data = doc.data() as Submission;
        let autoStatus = "No Submission";

        if (data.submittedAt && deadline) {
          const submittedAt = data.submittedAt.seconds * 1000;
          autoStatus = submittedAt <= deadline ? "On Time" : "Late";
        }

        return { ...data, id: doc.id, autoStatus, submittedBy: data.submittedBy };
      });

      // Extract users who have submitted
      const submittedUserIDs = fetchedSubmissions.map((sub) => sub.submittedBy);

      // Find recipients who have NOT submitted
      const missingRecipients = recipients
        .filter((userId) => !submittedUserIDs.includes(userId))
        .map((userId) => ({
          id: userId,
          submittedBy: userId,
          autoStatus: "No Submission",
        }));

      setSubmissions({ [selectedSubject]: [...fetchedSubmissions, ...missingRecipients] });
      setLoading(false);
    });

    return () => unsubscribe();
  });
}, [selectedSubject]);


  const handleStatusUpdate = async (submissionId: string | undefined, newStatus: string) => {
    if (!submissionId) {
      console.error("Submission ID is undefined");
      alert("Error: Submission ID is missing.");
      return;
    }
  
    try {
      const submissionRef = doc(db, "submittedDetails", submissionId);
      await updateDoc(submissionRef, { evaluatorStatus: newStatus });
  
      setSubmissions((prev) => {
        if (!selectedSubject || !prev[selectedSubject]) return prev;
        return {
          ...prev,
          [selectedSubject]: prev[selectedSubject].map((sub) =>
            sub.id === submissionId ? { ...sub, evaluatorStatus: newStatus } : sub
          ),
        };
      });
  
      console.log(`Updated evaluator status for submission ${submissionId} to ${newStatus}`);
    } catch (error) {
      console.error("Error updating evaluator status:", error);
      alert("Failed to update evaluator status.");
    }
  };
  
  

  return (
    <div className="dashboard-container">
    <section id="content">
      <main>
        <div className="head-title">
          <div className="left">
            <h2>Submission And Compliance Report</h2>
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
                <Link to="/evaluator/analytics/submission-analytics">Submissions and Compliance</Link>
              </li>
            </ul>
          </div>
        </div>
        
        <Select
          options={communications.map((comm) => ({
            value: comm.id,
            label: comm.subject,
          }))}
          onChange={(selectedOption) => setSelectedSubject(selectedOption?.value || "")}
          placeholder="Search or Select Subject"
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
  
        <h3>Modify Submission Status</h3>
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
                      ? new Date(sub.submittedAt.seconds * 1000).toLocaleString()
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
                        handleStatusUpdate(sub.id, selectedOption.value);
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
      </main>
    </section>
  </div>
  
  );
};

export default Analytics;
