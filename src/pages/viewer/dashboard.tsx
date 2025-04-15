import { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, onSnapshot, getDocs, query, where, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import "../../styles/components/dashboard.css";
import ReportMetricsChart from '../../pages/ReportMetricsChart'; // Import the chart component

const Dashboard = () => {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [newTask, setNewTask] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeUsers, setActiveUsers] = useState(0);
    const [totalReports, setTotalReports] = useState(0);
    const [onTimeReports, setOnTimeReports] = useState(0);
    const [lateReports, setLateReports] = useState(0);
    const [pendingReports, setPendingReports] = useState(0);
    const [forRevision, setForRevision] = useState(0);
    const [incomplete, setIncomplete] = useState(0);
    const [noSubmission, setNoSubmission] = useState(0);

    // Firebase Authentication state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user || null);
        });
        return () => unsubscribe();
    }, []);

    // Fetch tasks only if user is logged in
    useEffect(() => {
        if (currentUser) {
            const fetchTasks = async () => {
                setLoading(true);
                try {
                    const tasksRef = collection(db, 'tasks');
                    const q = query(tasksRef, where("userId", "==", currentUser.uid));
                    const tasksSnapshot = await getDocs(q);
                    const tasksList = tasksSnapshot.docs.map((doc) => {
                        const data = doc.data();
                        return { id: doc.id, ...data, createdAt: data.createdAt || { seconds: 0 } };
                    });
                    tasksList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    setTasks(tasksList);
                } catch (err) {
                    console.error('Error fetching tasks from Firestore:', err);
                    setError('Failed to fetch tasks. Please try again later.');
                } finally {
                    setLoading(false);
                }
            };

            fetchTasks();
        }
    }, [currentUser]);

    // Fetch total registered users count
    useEffect(() => {
        const fetchRegisteredUsers = async () => {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            setActiveUsers(usersSnapshot.size);
        };
        fetchRegisteredUsers();
    }, []);

    useEffect(() => {
        const submitRef = collection(db, 'submittedDetails');
    
        // Subscribe to submittedDetails collection
        const submitUnsubscribe = onSnapshot(submitRef, async () => {
            // Fetch total submitted reports count
            const submitSnapshot = await getDocs(submitRef);
            setTotalReports(submitSnapshot.size); // Total reports submitted
    
            // Fetch the status counts: OnTime, Pending, Late, For Revision, Incomplete, and No Submission
            const statusQueries = [
                { status: "On Time", setter: setOnTimeReports },
                { status: "Pending", setter: setPendingReports },
                { status: "Late", setter: setLateReports },
                { status: "For Revision", setter: setForRevision },
                { status: "Incomplete", setter: setIncomplete },
            ];
    
            // Fetch and set the counts for each status (On Time, Pending, Late, etc.)
            await Promise.all(
                statusQueries.map(async ({ status, setter }) => {
                    const statusSnapshot = await getDocs(query(submitRef, where("evaluatorStatus", "==", status)));
                    setter(statusSnapshot.size);
                })
            );
    
            // Fetch the "No Submission" status separately
            const noSubmissionSnapshot = await getDocs(query(submitRef, where("evaluatorStatus", "==", "No Submission")));
            setNoSubmission(noSubmissionSnapshot.size);
    
            // Now update the total pending reports: Pending + No Submission
            setPendingReports(prev => noSubmissionSnapshot.size + prev);  // Adding Pending reports + No Submission reports
        });
    
        return () => {
            submitUnsubscribe();
        };
    }, []); // This effect will run only once to set up the listener
    
    // Update No Submission after pendingReports state has been updated
    useEffect(() => {
        setNoSubmission(pendingReports); // Assuming 'pendingReports' is the number of reports with no submission
    }, [pendingReports]); // Run this effect when 'pendingReports' changes
    
    const addTask = async () => {
        if (newTask.trim() && currentUser?.uid) {
            const newTaskObj = {
                text: newTask,
                completed: false,
                userId: currentUser.uid,
                createdAt: new Date()
            };
            try {
                const docRef = await addDoc(collection(db, 'tasks'), newTaskObj);
                setTasks(prevTasks => [...prevTasks, { id: docRef.id, ...newTaskObj }]);
                setNewTask("");
                setStatusMessage('Task added successfully!');
                setTimeout(() => setStatusMessage(null), 3000);
            } catch (err) {
                console.error('Error adding task to Firestore:', err);
                setError('Failed to add task. Please try again later.');
            }
        }
    };

    const toggleTaskCompletion = async (id: string, completed: boolean) => {
        const updatedTask = { completed: !completed };
        try {
            const taskDoc = doc(db, 'tasks', id);
            await updateDoc(taskDoc, updatedTask);
            setTasks(prevTasks => prevTasks.map(task =>
                task.id === id ? { ...task, completed: !completed } : task
            ));
            setStatusMessage(completed ? 'Task marked as incomplete' : 'Task completed');
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (err) {
            console.error('Error updating task completion in Firestore:', err);
            setError('Failed to update task status. Please try again later.');
        }
    };

    const removeTask = async (id: string, completed: boolean) => {
        if (!completed) {
            setError("Task hasn't been resolved yet");
            setTimeout(() => setError(null), 3000);
            return;
        }
        try {
            const taskDoc = doc(db, 'tasks', id);
            await deleteDoc(taskDoc);
            setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
            setStatusMessage('Task deleted successfully!');
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (err) {
            console.error('Error deleting task from Firestore:', err);
            setError('Failed to delete task. Please try again later.');
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "No date available";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    };

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    if (loading) return <div>Loading...</div>;
    if (!currentUser) return <div>Please log in to view your tasks.</div>;

    return (
        <div className="dashboard-container">
            <section id="content">
                <main>
                    <div className="head-title">
                        <div className="left">
                            <h1>Evaluator Dashboard</h1>
                            <ul className="breadcrumb">
                                <li>
                                    <a href="/dashboards" className="active">Home</a>
                                </li>
                                <li>
                                    <i className='bx bx-chevron-right'> </i>
                                </li>
                                <li>
                                    <a>Dashboard Tools</a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Metrics + Chart Section */}
                    <div className="dashboard-metrics-chart-wrapper">
                        <div className="metrics-panel">
                            {[ 
                                { label: 'Total Reports Submitted', value: totalReports },
                                { label: 'On Time Report Submitted', value: onTimeReports, percent: onTimeReports / totalReports },
                                { label: 'Pending Reports / No Submission', value: pendingReports, percent: pendingReports + noSubmission / totalReports },
                                { label: 'Late Reports', value: lateReports, percent: lateReports / totalReports },
                                { label: 'For Revision', value: forRevision, percent: forRevision / totalReports },
                                { label: 'Incomplete Reports', value: incomplete, percent: incomplete / totalReports },
                                { label: 'Total Registered Users', value: activeUsers },
                            ].map(({ label, value, percent }, index) => (
                                <div key={index} className="metric">
                                    <h3>{label}</h3>
                                    <p>{value} {percent && `(${(percent * 100).toFixed(2)}%)`}</p>
                                </div>
                            ))}
                        </div>

                        <div className="chart-panel">
                            <ReportMetricsChart 
                                totalReports={totalReports}
                                pendingReports={pendingReports}
                                lateReports={lateReports}
                                onTimeReports={onTimeReports}
                                forRevision={forRevision}
                                incomplete={incomplete}
                                noSubmission    
                                />
                        </div>
                    </div>

                    <div className="metrics-footer">
                        <button className="open-modal-btn" onClick={openModal}>View To-Do List</button>
                    </div>

                    {isModalOpen && (
                        <div className="modal-overlay">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h3>To-Do List</h3>
                                    <button className="close-modal-btn" onClick={closeModal}>X</button>
                                </div>

                                <div className="todo-input">
                                    <textarea
                                        value={newTask}
                                        onChange={(e) => setNewTask(e.target.value)}
                                        placeholder="New task..."
                                        rows={3}
                                    />
                                    <button onClick={addTask}>Add</button>
                                </div>

                                {statusMessage && <div className="status-message">{statusMessage}</div>}
                                {error && <div className="error-message">{error}</div>}

                                <div className="todo-table-wrapper">
                                    <table className="todo-table">
                                        <thead>
                                            <tr>
                                                <th>Completed</th>
                                                <th>Task</th>
                                                <th>Created At</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tasks.length ? tasks.map(({ id, text, completed, createdAt }) => (
                                                <tr key={id} className={completed ? "completed" : "not-completed"}>
                                                    <td>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={completed} 
                                                            onChange={() => toggleTaskCompletion(id, completed)} 
                                                        />
                                                    </td>
                                                    <td>{text}</td>
                                                    <td>{formatDate(createdAt)}</td>
                                                    <td>
                                                        <button 
                                                            onClick={() => removeTask(id, completed)} 
                                                            className="delete-btn"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={4}>No tasks available</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </section>
        </div>
    );
};
export default Dashboard;