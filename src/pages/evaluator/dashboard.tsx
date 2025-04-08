import { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; 
import "../../styles/components/dashboard.css";
import ReportMetricsChart from './ReportMetricsChart'; // Import the chart component

const Dashboard = () => {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);  
    const [newTask, setNewTask] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);  // Modal visibility state
    const [activeUsers, setActiveUsers] = useState<number>(0); // Registered users count
    const [totalReports, setTotalReports] = useState(0);
    const [lateReports, setLateReports] = useState(0);
    const [pendingReports, setPendingReports] = useState(0);

    // Firebase Authentication state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                setCurrentUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (currentUser) {
            const fetchTasks = async () => {
                try {
                    const tasksRef = collection(db, 'tasks');
                    const q = query(tasksRef, where("userId", "==", currentUser.uid));
                    const tasksSnapshot = await getDocs(q);
                    const tasksList = tasksSnapshot.docs.map((doc) => {
                        const data = doc.data();
                        return { 
                            id: doc.id, 
                            ...data, 
                            createdAt: data.createdAt ? data.createdAt : { seconds: 0 } 
                        };
                    });

                    // Sort tasks by createdAt in descending order (latest first)
                    tasksList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

                    setTasks(tasksList);
                } catch (error) {
                    console.error('Error fetching tasks from Firestore:', error);
                    setError('Failed to fetch tasks. Please try again later.');
                    setTimeout(() => setStatusMessage(null), 3000);
                } finally {
                    setLoading(false);
                }
            };

            fetchTasks();
        }
    }, [currentUser]);

    // Fetch total registered users
    const fetchRegisteredUsers = async () => {
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        setActiveUsers(usersSnapshot.size); // Set total registered users count
    };

    useEffect(() => {
        fetchRegisteredUsers();
    }, []);  // Only run once when component mounts

    // Fetch reports metrics
    const fetchReportsMetrics = async () => {
        try {
            const reportsRef = collection(db, 'communications');
            const submitRef = collection(db, 'submittedDetails');
            
            // Total reports
            const reportsSnapshot = await getDocs(reportsRef);
            setTotalReports(reportsSnapshot.size);  // Total reports count

            // Pending reports
            const pendingQuery = query(submitRef, where("evaluatorStatus", "==", "Pending"));
            const pendingSnapshot = await getDocs(pendingQuery);
            setPendingReports(pendingSnapshot.size);  // Pending reports count

            // Late reports
            const lateQuery = query(submitRef, where("evaluatorStatus", "==", "Late"));
            const lateSnapshot = await getDocs(lateQuery);
            setLateReports(lateSnapshot.size);  // Late reports count
        } catch (error) {
            console.error('Error fetching reports metrics:', error);
        }
    };

    useEffect(() => {
        fetchReportsMetrics();
    }, []);  // Only run once when component mounts

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
                setTasks((prevTasks) => [...prevTasks, { id: docRef.id, ...newTaskObj }]);
                setNewTask(""); 
                setStatusMessage('Task added successfully!');
                setTimeout(() => setStatusMessage(null), 3000);
            } catch (error) {
                console.error('Error adding task to Firestore:', error);
                setError('Failed to add task. Please try again later.');
                setStatusMessage('An error occurred while adding the task.');
                setTimeout(() => setStatusMessage(null), 3000);
            }
        }
    };

    const toggleTaskCompletion = async (id: string, completed: boolean) => {
        const updatedTask = { completed: !completed };

        try {
            const taskDoc = doc(db, 'tasks', id);
            await updateDoc(taskDoc, updatedTask);
            setTasks((prevTasks) =>
                prevTasks.map((task) =>
                    task.id === id ? { ...task, completed: !completed } : task
                )
            );
            setStatusMessage(completed ? 'Task marked as incomplete' : 'Task completed');
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
            console.error('Error updating task completion in Firestore:', error);
            setError('Failed to update task status. Please try again later.');
            setStatusMessage('An error occurred while updating the task status.');
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    const removeTask = async (id: string, completed: boolean) => {
        if (!completed) {
            setError("Task hasn't been resolved yet");
            setTimeout(() => setError(null), 3000); // Hide the error after 3 seconds
            return;
        }
    
        try {
            const taskDoc = doc(db, 'tasks', id);
            await deleteDoc(taskDoc);
            setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
            setStatusMessage('Task deleted successfully!');
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
            console.error('Error deleting task from Firestore:', error);
            setError('Failed to delete task. Please try again later.');
            setStatusMessage('An error occurred while deleting the task.');
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) {
            return "No date available"; 
        }

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    };

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    if (loading) return <div>Loading...</div>;

    if (!currentUser) {
        return <div>Please log in to view your tasks.</div>;
    }

    return (
        <div className="dashboard-container">
            <section id="content">
                <main>
                    <div className="head-title">
                        <div className="left">
                            <h1>Evaluator Dashboard</h1>
                            <ul className="breadcrumb">
                                <li><a className="active" href="#">Home</a></li>
                                <li><i className='bx bx-chevron-right'></i></li>
                                <li><a href="#">Dashboard Tools</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* Display Metrics */}
                    {/* Combined Metrics + Chart Section */}
                        <div className="dashboard-metrics-chart-wrapper">
                    {/* Metrics on the left */}
                        <div className="metrics-panel">
                            <div className="metric">
                                <h3>Total Reports Submitted</h3>
                                    <p>{totalReports}</p>
                        </div>
                        <div className="metric">
                            <h3>Pending Reports</h3>
                                <p>{pendingReports} ({((pendingReports / totalReports) * 100).toFixed(2)}%)</p>
                        </div>
                        <div className="metric">
                            <h3>Late Reports</h3>
                                <p>{lateReports} ({((lateReports / totalReports) * 100).toFixed(2)}%)</p>
                        </div>
                            <div className="metric">
                                <h3>Total Registered Users</h3>
                                    <p>{activeUsers}</p>
                        </div>
                    </div>

                    {/* Chart on the right */}
                        <div className="chart-panel">
                            <ReportMetricsChart 
                            totalReports={totalReports} 
                            pendingReports={pendingReports} 
                            lateReports={lateReports} 
                        />
                        </div>
                    </div>

                    {/* View To-Do List button */}
                    <div className="metrics-footer">
                        <button className="open-modal-btn" onClick={openModal}>View To-Do List</button>
                    </div>


                    {/* Modal for To-Do List */}
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

                                {/* Display Status Message */}
                                {statusMessage && <div className="status-message">{statusMessage}</div>}
                                {error && <div className="error-message">{error}</div>}

                                {/* To-Do List Table */}
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
                                            {tasks.length > 0 ? (
                                                tasks.map(({ id, text, completed, createdAt }) => (
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
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4}>No tasks available</td>
                                                </tr>
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
