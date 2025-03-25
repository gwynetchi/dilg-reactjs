import { useState, useEffect } from 'react';
import { db } from '../../firebase'; // Import Firebase configuration
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import "../../styles/components/dashboard.css"; // Ensure you have the corresponding CSS file

const Dashboard = () => {
    const [currentUser, setCurrentUser] = useState<any>(null);  // State to store the current user
    const [tasks, setTasks] = useState<any[]>([]);  // State to store tasks
    const [newTask, setNewTask] = useState("");  // State for new task input
    const [loading, setLoading] = useState(true);  // Loading state while fetching data

    // Fetch the current user (you can replace this with actual auth code)
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await fetch('/api/auth/currentUser', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,  // Example token-based auth
                    },
                });
                const user = await response.json();
                setCurrentUser(user);
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };

        fetchCurrentUser();
    }, []);

    // Fetch tasks from Firestore for the logged-in user
    useEffect(() => {
        if (currentUser) {
            const fetchTasks = async () => {
                try {
                    const tasksCollection = collection(db, 'tasks');
                    const tasksSnapshot = await getDocs(tasksCollection);
                    const tasksList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setTasks(tasksList);
                } catch (error) {
                    console.error('Error fetching tasks from Firestore:', error);
                } finally {
                    setLoading(false);
                }
            };

            fetchTasks();
        }
    }, [currentUser]);

    // Function to handle adding a new task to Firestore
    const addTask = async () => {
        if (newTask.trim() && currentUser?.id) {
            const newTaskObj = { text: newTask, completed: false, userId: currentUser.id };
            try {
                const docRef = await addDoc(collection(db, 'tasks'), newTaskObj);
                setTasks((prevTasks) => [...prevTasks, { id: docRef.id, ...newTaskObj }]);
                setNewTask(""); // Clear input field after adding
            } catch (error) {
                console.error('Error adding task to Firestore:', error);
            }
        }
    };

    // Function to toggle the completion status of a task in Firestore
    const toggleTaskCompletion = async (id: string) => {
        const taskToUpdate = tasks.find((task) => task.id === id);
        const updatedTask = { ...taskToUpdate, completed: !taskToUpdate.completed };

        try {
            const taskDoc = doc(db, 'tasks', id);
            await updateDoc(taskDoc, { completed: updatedTask.completed });
            setTasks((prevTasks) =>
                prevTasks.map((task) => task.id === id ? { ...task, completed: updatedTask.completed } : task)
            );
        } catch (error) {
            console.error('Error updating task completion in Firestore:', error);
        }
    };

    // Function to remove a task from Firestore
    const removeTask = async (id: string) => {
        try {
            const taskDoc = doc(db, 'tasks', id);
            await deleteDoc(taskDoc);
            setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
        } catch (error) {
            console.error('Error deleting task from Firestore:', error);
        }
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

                        <ul className="todo-list">
                            {tasks.length > 0 ? (
                                tasks.map(({ id, text, completed }) => (
                                    <li key={id} className={completed ? "completed" : "not-completed"}>
                                        <p onClick={() => toggleTaskCompletion(id)}>{text}</p>
                                        <i className='bx bx-dots-vertical-rounded' onClick={() => removeTask(id)}></i>
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
