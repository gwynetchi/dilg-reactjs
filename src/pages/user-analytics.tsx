import React, { useState, useEffect } from "react";
import Select from "react-select";
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Table } from "react-bootstrap";
import "../styles/components/pages.css";

interface Submission {
  id: string;
  submittedBy: string;
  submittedAt?: { seconds: number };
  evaluatorStatus?: string;
  messageID?: string;
  subject?: string;
}

interface ChartData {
  status: string;
  count: number;
}

const allStatuses = ["On Time", "Late", "Incomplete", "No Submission", "For Revision"];
const statusColors: Record<string, string> = {
  "On Time": "#28a745",
  "Late": "#dc3545",
  "Incomplete": "#ffc107",
  "No Submission": "#6c757d",
  "For Revision": "#17a2b8",
};

const Analytics: React.FC = () => {
  const [users, setUsers] = useState<Record<string, string>>({});
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersList = snapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        acc[doc.id] = `${data.fname} ${data.mname ? data.mname + " " : ""}${data.lname}`.trim();
        return acc;
      }, {} as Record<string, string>);
      setUsers(usersList);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    let submissionsQuery = query(
      collection(db, "submittedDetails"),
      where("submittedBy", "==", selectedUser)
    );

    const unsubscribe = onSnapshot(submissionsQuery, async (snapshot) => {
      let fetchedSubmissions = snapshot.docs.map((doc) => doc.data() as Submission);

      if (selectedMonth !== null) {
        fetchedSubmissions = fetchedSubmissions.filter((sub) => {
          return (
            sub.submittedAt &&
            new Date(sub.submittedAt.seconds * 1000).getMonth() === selectedMonth
          );
        });
      }

      if (selectedYear !== null) {
        fetchedSubmissions = fetchedSubmissions.filter((sub) => {
          return (
            sub.submittedAt &&
            new Date(sub.submittedAt.seconds * 1000).getFullYear() === selectedYear
          );
        });
      }

      for (const sub of fetchedSubmissions) {
        if (sub.messageID) {
          const commDoc = await getDoc(doc(db, "communications", sub.messageID));
          if (commDoc.exists()) {
            sub.subject = commDoc.data().subject;
          }
        }
      }

      setSubmissions(fetchedSubmissions);
    });
    return () => unsubscribe();
  }, [selectedUser, selectedMonth, selectedYear]);

  useEffect(() => {
    const statusCount: Record<string, number> = allStatuses.reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {}
    );

    submissions.forEach((sub) => {
      const evaluatorStatus = sub.evaluatorStatus || "No Submission";
      statusCount[evaluatorStatus] += 1;
    });

    setChartData(allStatuses.map((status) => ({ status, count: statusCount[status] })));
  }, [submissions]);

  return (
    <div className="dashboard-container">
      <main>
        <h2>Submission And Compliance Report</h2>
        <div className="dropdown-container">
          <Select
            options={Object.entries(users).map(([id, name]) => ({ value: id, label: name }))}
            onChange={(option) => setSelectedUser(option?.value || "")}
            placeholder="Select User"
            isClearable
          />
          <Select
            options={Array.from({ length: 12 }, (_, i) => ({ value: i, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }))}
            onChange={(option) => setSelectedMonth(option?.value ?? null)}
            placeholder="Select Month"
            isClearable
          />
          <Select
            options={Array.from({ length: 10 }, (_, i) => ({ value: new Date().getFullYear() - i, label: (new Date().getFullYear() - i).toString() }))}
            onChange={(option) => setSelectedYear(option?.value ?? null)}
            placeholder="Select Year"
            isClearable
          />
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis dataKey="status" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" name="Status Count" barSize={40}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={statusColors[entry.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <h3>Submission Details</h3>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Submitted At</th>
              <th>Subject in Communications</th>
              <th>Evaluator Status</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length > 0 ? (
              submissions.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    {sub.submittedAt
                      ? new Date(sub.submittedAt.seconds * 1000).toLocaleString()
                      : "Not Submitted"}
                  </td>
                  <td>{sub.subject || "N/A"}</td>
                  <td>{sub.evaluatorStatus || "No Submission"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>No submissions found.</td>
              </tr>
            )}
          </tbody>
        </Table>
      </main>
    </div>
  );
};

export default Analytics;
 