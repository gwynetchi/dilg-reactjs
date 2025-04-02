import React, { useState, useEffect } from "react";
import Select from "react-select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Table } from "react-bootstrap";
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
  evaluatorStatus?: string;
  autoStatus?: string;
}

const Analytics: React.FC = () => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(false);
  const [users, setUsers] = useState<Record<string, string>>({});

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString("default", { month: "long" }),
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: new Date().getFullYear() - i,
    label: (new Date().getFullYear() - i).toString(),
  }));

  useEffect(() => {
    setLoading(true);

    const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getTime() / 1000;
    const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).getTime() / 1000;

    const commQuery = query(
      collection(db, "communications"),
      where("deadline.seconds", ">=", startOfMonth),
      where("deadline.seconds", "<=", endOfMonth)
    );

    const unsubscribe = onSnapshot(commQuery, (snapshot) => {
      const fetchedCommunications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Communication),
      }));

      setCommunications(fetchedCommunications);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (communications.length === 0) return;

    setLoading(true);
    const submissionsPromises = communications.map(async (comm) => {
      const subQuery = query(
        collection(db, "submittedDetails"),
        where("messageId", "==", comm.id)
      );

      const subSnapshot = await getDocs(subQuery);
      const fetchedSubmissions = subSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Submission),
      }));

      return { [comm.id]: fetchedSubmissions.length > 0 ? fetchedSubmissions : [{ id: "no-submission", submittedBy: "None", status: "No Submission" }] };
    });

    Promise.all(submissionsPromises).then((results) => {
      setSubmissions(Object.assign({}, ...results));
      setLoading(false);
    });
  }, [communications]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (querySnapshot) => {
      const usersList = querySnapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        acc[doc.id] = `${data.fname} ${data.lname}`;
        return acc;
      }, {} as Record<string, string>);

      setUsers(usersList);
    });

    return () => unsubscribe();
  }, []);

  const chartData = communications.map((comm) => {
    const subs = submissions[comm.id] || [];
    return {
      subject: comm.subject,
      onTime: subs.filter((s) => s.status === "On Time").length,
      late: subs.filter((s) => s.status === "Late").length,
      incomplete: subs.filter((s) => s.status === "Incomplete").length,
      noSubmission: subs.filter((s) => s.status === "No Submission").length,
    };
  });

  return (
    <div className="dashboard-container">
      <main>
        <h2>Submission And Compliance Report</h2>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <Select
            options={monthOptions}
            value={monthOptions.find((opt) => opt.value === selectedMonth)}
            onChange={(selectedOption) => setSelectedMonth(selectedOption?.value || new Date().getMonth() + 1)}
            placeholder="Select Month"
          />
          <Select
            options={yearOptions}
            value={yearOptions.find((opt) => opt.value === selectedYear)}
            onChange={(selectedOption) => setSelectedYear(selectedOption?.value || new Date().getFullYear())}
            placeholder="Select Year"
          />
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="onTime" stackId="a" fill="#66bb6a" />
                <Bar dataKey="late" stackId="a" fill="#ffa726" />
                <Bar dataKey="incomplete" stackId="a" fill="#ef5350" />
                <Bar dataKey="noSubmission" stackId="a" fill="#bdbdbd" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </main>
    </div>
  );
};

export default Analytics;
