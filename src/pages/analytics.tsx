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
import { Form, Table, Button } from "react-bootstrap";
import "../styles/components/pages.css";

interface Communication {
  id: string;
  subject: string;
  deadline?: { seconds: number };
}

interface Submission {
  id: string;
  submittedBy: string;
  submittedAt?: { seconds: number };
  status?: string;
  manualStatus?: string;
  autoStatus?: string;
}

interface ChartData {
  status: string;
  count: number;
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
      const fetchedCommunications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Communication[];
      setCommunications(fetchedCommunications);
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

    const fetchDeadline = async () => {
      const commRef = doc(db, "communications", selectedSubject);
      const commSnap = await getDoc(commRef);
      if (commSnap.exists()) {
        const deadline = commSnap.data().deadline?.seconds * 1000;
        setSelectedDeadline(deadline ? new Date(deadline).toLocaleString() : "No Deadline");
        return deadline;
      }
      return null;
    };

    fetchDeadline().then((deadline) => {
      const submissionsQuery = query(
        collection(db, "submittedDetails"),
        where("messageId", "==", selectedSubject)
      );

      const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
        const fetchedSubmissions = snapshot.docs.map((doc) => {
          const data = doc.data() as Submission;
          let autoStatus = "No Submission";

          if (data.submittedAt && deadline) {
            const submittedAt = data.submittedAt.seconds * 1000;
            autoStatus = submittedAt <= deadline ? "On Time" : "Late";
          }

          return { ...data, autoStatus };
        });

        setSubmissions({ [selectedSubject]: fetchedSubmissions });
        setLoading(false);
      });

      return () => unsubscribe();
    });
  }, [selectedSubject]);

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

  // Update chart data based on submissions
  useEffect(() => {
    if (!selectedSubject || !submissions[selectedSubject]) {
      setChartData(allStatuses.map((status) => ({ status, count: 0 })));
      return;
    }

    const statusCount: Record<string, number> = {};

    // Initialize all statuses with 0
    allStatuses.forEach((status) => (statusCount[status] = 0));

    // Count actual submissions
    submissions[selectedSubject].forEach((sub) => {
      const status = sub.manualStatus || sub.autoStatus || "No Submission";
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const formattedChartData = allStatuses.map((status) => ({
      status,
      count: statusCount[status],
    }));

    setChartData(formattedChartData);
  }, [submissions, selectedSubject]);

  const handleStatusChange = (submissionId: string, newStatus: string) => {
    setPendingStatus((prev) => ({ ...prev, [submissionId]: newStatus }));
  };

  const handleSaveStatus = async (submissionId: string) => {
    if (!pendingStatus[submissionId]) return;

    try {
      const submissionRef = doc(db, "submittedDetails", submissionId);
      await updateDoc(submissionRef, { manualStatus: pendingStatus[submissionId] });

      alert("Status updated successfully!");
      setPendingStatus((prev) => {
        const updatedStatus = { ...prev };
        delete updatedStatus[submissionId];
        return updatedStatus;
      });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
          <h2>Submission Analytics</h2>
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
  <Bar
    dataKey="count"
    name="Submissions"
    barSize={50} // Adjust bar size if needed
    isAnimationActive={true}
  >
    {chartData.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={statusColors[entry.status] || "#8884d8"} />
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
                <th>Action</th>
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
                      <Form.Select
                        value={pendingStatus[sub.id] ?? sub.manualStatus ?? ""}
                        onChange={(e) => handleStatusChange(sub.id, e.target.value)}
                      >
                        {allStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Form.Select>
                    </td>
                    <td>
                      <Button variant="primary" onClick={() => handleSaveStatus(sub.id)}>
                        Save
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No submissions found.</td>
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
