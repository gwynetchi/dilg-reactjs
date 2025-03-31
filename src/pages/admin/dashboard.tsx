import { useState, useEffect } from 'react';
import { db, auth } from '../../firebase'; // Import Firebase configuration
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; // Firebase authentication state listener
import "../../styles/components/dashboard.css"; // Ensure you have the corresponding CSS file

const Dashboard = () => {
    const [currentUser, setCurrentUser] = useState<any>(null);  // State to store the current user
    const [tasks, setTasks] = useState<any[]>([]);  // State to store tasks
    const [newTask, setNewTask] = useState("");  // State for new task input
    const [loading, setLoading] = useState(true);  // Loading state while fetching data
    const [error, setError] = useState<string | null>(null); // Error state to handle fetch/add task errors

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

    // Fetch tasks from Firestore for the logged-in user
    useEffect(() => {
        if (currentUser) {
            const fetchTasks = async () => {
                try {
                    const tasksRef = collection(db, 'tasks');
                    const q = query(tasksRef, where("userId", "==", currentUser.uid));
                    const tasksSnapshot = await getDocs(q);
                    const tasksList = tasksSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                    setTasks(tasksList);
                } catch (error) {
                    console.error('Error fetching tasks from Firestore:', error);
                    setError('Failed to fetch tasks. Please try again later.');
                } finally {
                    setLoading(false);
                }
            };

            fetchTasks();
        }
    }, [currentUser]);

    // Function to handle adding a new task to Firestore
    const addTask = async () => {
        if (newTask.trim() && currentUser?.uid) {
            const newTaskObj = { 
                text: newTask, 
                completed: false, 
                userId: currentUser.uid,  // Ensure the userId is set correctly
                createdAt: new Date() // Timestamp for when the task was created
            };
            try {
                const docRef = await addDoc(collection(db, 'tasks'), newTaskObj);
                setTasks((prevTasks) => [...prevTasks, { id: docRef.id, ...newTaskObj }]);
                setNewTask(""); // Clear input field after adding
            } catch (error) {
                console.error('Error adding task to Firestore:', error);
                setError('Failed to add task. Please try again later.');
            }
        }
    };

    // Function to toggle the completion status of a task in Firestore
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
        } catch (error) {
            console.error('Error updating task completion in Firestore:', error);
            setError('Failed to update task status. Please try again later.');
        }
    };

    // Function to remove a task from Firestore
    const removeTask = async (id: string) => {
        try {
            const taskDoc = doc(db, 'tasks', id);
            await deleteDoc(taskDoc);
            setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id)); // Remove from state
        } catch (error) {
            console.error('Error deleting task from Firestore:', error);
            setError('Failed to delete task. Please try again later.');
        }
    };

    // Format the created date to display it
    const formatDate = (timestamp: any) => {
        if (!timestamp) {
            return "No date available"; // If there's no timestamp, return a fallback message.
        }
        
        // Check if it's a Firestore timestamp and convert it to a date
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    };
    
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
                            <h1>Admin Dashboard</h1>
                            <ul className="breadcrumb">
                                <li><a href="#">Administrative Tools</a></li>
                                <li><i className='bx bx-chevron-right'></i></li>
                                <li><a className="active" href="#">Home</a></li>
                            </ul>
                        </div>
                        <a href="#" className="btn-download">
                            <i className='bx bxs-cloud-download bx-fade-down-hover'></i>
                            <span className="text">PDF Export</span>
                        </a>
                    </div>

                    {/* TODO List */}
                    <div className="todo">
                        <div className="head">
                            <h3>Todos</h3>
                            <i className='bx bx-plus icon' onClick={addTask}></i>
                            <i className='bx bx-filter'></i>
                        </div>
                        <div className="todo-input">
                            <input
                                type="text"
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                placeholder="New task..."
                            />
                            <button onClick={addTask}>Add</button>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <ul className="todo-list">
                            {tasks.length > 0 ? (
                                tasks.map(({ id, text, completed, createdAt }) => (
                                    <li key={id} className={completed ? "completed" : "not-completed"}>
                                        <div>
                                            {/* Checkbox for toggling completion */}
                                            <input 
                                                type="checkbox" 
                                                checked={completed} 
                                                onChange={() => toggleTaskCompletion(id, completed)} 
                                            />
                                            <p>{text}</p>
                                            <span className="task-time">
                                                {`Created: ${formatDate(createdAt)}`}
                                            </span>
                                        </div>
                                        <button onClick={() => removeTask(id)} className="delete-btn">Delete</button> {/* Delete button */}
                                    </li>
                                ))
                            ) : (
                                <li>No tasks available</li>
                            )}
                        </ul>
                    </div>
                </main>
            </section>
        </div>
    );
};

export default Dashboard;
