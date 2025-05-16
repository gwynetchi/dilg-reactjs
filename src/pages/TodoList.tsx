import React, { useState, useEffect, ChangeEvent } from 'react';
import { db, auth } from "../firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc,
  onSnapshot 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// Define the Task interface
interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  userId: string;
}

const TodoList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState<string>('');
  const [isAddingTask, setIsAddingTask] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isTodoCollapsed, setIsTodoCollapsed] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // State for task editing
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskText, setEditTaskText] = useState<string>('');

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        loadTasks(user.uid);
      } else {
        setCurrentUser(null);
        setTasks([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadTasks = async (userId: string) => {
    try {
      const tasksRef = collection(db, "tasks");
      const q = query(tasksRef, where("userId", "==", userId));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const tasksData: Task[] = [];
        querySnapshot.forEach((doc) => {
          tasksData.push({
            id: doc.id,
            ...doc.data()
          } as Task);
        });
        // Sort by updatedAt (newest first)
        tasksData.sort((a, b) => 
          new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
        );
        setTasks(tasksData);
      });

      return unsubscribe;
    } catch (err) {
      console.error("Error loading tasks:", err);
      setError("Failed to load tasks");
    }
  };

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const formatDate = (date: string): string => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const toggleTodo = (): void => {
    setIsTodoCollapsed(prev => !prev);
  };

  const addTask = async (): Promise<void> => {
    if (!newTask.trim()) {
      setError('Task cannot be empty.');
      return;
    }

    if (!currentUser) {
      setError('You must be logged in to add tasks.');
      return;
    }

    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "tasks"), {
        text: newTask.trim(),
        completed: false,
        createdAt: now,
        updatedAt: now, // Set updatedAt when task is created
        userId: currentUser.uid
      });
      setNewTask('');
      setIsAddingTask(false);
      setStatusMessage('Task added successfully!');
    } catch (err) {
      console.error("Error adding task:", err);
      setError('Failed to add task');
    }
  };

  const removeTask = async (id: string, completed: boolean): Promise<void> => {
    if (!completed) {
      setError('Please complete the task before removing it.');
      return;
    }

    try {
      await deleteDoc(doc(db, "tasks", id));
      setStatusMessage('Task removed successfully!');
    } catch (err) {
      console.error("Error removing task:", err);
      setError('Failed to remove task');
    }
  };

  const toggleTaskCompletion = async (id: string, currentStatus: boolean): Promise<void> => {
    try {
      await updateDoc(doc(db, "tasks", id), {
        completed: !currentStatus
      });
      setStatusMessage(currentStatus ? 'Task marked as incomplete.' : 'Task marked as complete!');
    } catch (err) {
      console.error("Error updating task:", err);
      setError('Failed to update task');
    }
  };

  const startEditingTask = (id: string, text: string): void => {
    setEditingTaskId(id);
    setEditTaskText(text);
  };

  const saveEditedTask = async (id: string): Promise<void> => {
    if (!editTaskText.trim()) {
      setError('Task cannot be empty.');
      return;
    }

    try {
      await updateDoc(doc(db, "tasks", id), {
        text: editTaskText.trim(),
        updatedAt: new Date().toISOString()
      });
      setEditingTaskId(null);
      setEditTaskText('');
      setStatusMessage('Task updated successfully!');
    } catch (err) {
      console.error("Error updating task:", err);
      setError('Failed to update task');
    }
  };

  const cancelEditingTask = (): void => {
    setEditingTaskId(null);
    setEditTaskText('');
  };

  const handleTaskTextChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setNewTask(e.target.value);
  };

  const handleEditTaskTextChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setEditTaskText(e.target.value);
  };

  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0"><i className="bx bx-list-check"></i> To-Do List</h5>
        <button className="btn btn-sm btn-light" onClick={toggleTodo}>
          <i className={`bx ${isTodoCollapsed ? 'bx-chevron-down' : 'bx-chevron-up'}`}></i>
        </button>
      </div>
      
      <div className={`card-body ${isTodoCollapsed ? 'd-none' : ''}`}>
        {!isAddingTask && (
          <button 
            onClick={() => setIsAddingTask(true)} 
            className="btn btn-primary btn-sm w-100 mb-3"
          >
            <i className="bx bx-plus"></i> Add New Task
          </button>
        )}

        {isAddingTask && (
          <div className="mb-3">
            <textarea
              value={newTask}
              onChange={handleTaskTextChange}
              placeholder="Enter a new task..."
              rows={2}
              className="form-control form-control-sm mb-2"
              autoFocus
            />
            <div className="d-flex gap-2">
              <button 
                onClick={addTask} 
                className="btn btn-success btn-sm flex-grow-1"
              >
                <i className="bx bx-plus"></i> Add Task
              </button>
              <button 
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTask('');
                }} 
                className="btn btn-light btn-sm"
              >
                <i className="bx bx-x"></i> Cancel
              </button>
            </div>
          </div>
        )}

        {statusMessage && (
          <div className="alert alert-success py-2 small">
            <i className="bx bx-check-circle"></i> {statusMessage}
          </div>
        )}
        
        {error && (
          <div className="alert alert-danger py-2 small">
            <i className="bx bx-error-circle"></i> {error}
          </div>
        )}

        <div style={{maxHeight: "300px", overflowY: "auto", overflowX: "hidden"}}>
          {tasks.length === 0 ? (
            <div className="text-center text-muted py-3">
              <i className="bx bx-notepad fs-3"></i>
              <p className="small mt-2">No tasks added yet.</p>
            </div>
          ) : (
            <ul className="list-group list-group-flush">
              {tasks.map(({ id, text, completed, createdAt, updatedAt }) => (
                <li key={id} className="list-group-item px-0 py-2">
                  <div className="d-flex">
                    {editingTaskId !== id && (
                      <>
                        <div className="me-2 pt-1 flex-shrink-0">
                          <input
                            type="checkbox"
                            id={`task-${id}`}
                            checked={completed}
                            onChange={() => toggleTaskCompletion(id, completed)}
                            className="form-check-input"
                          />
                        </div>
                        
                        <div className="flex-grow-1 min-width-0">
                          <div 
                            className="small text-break" 
                            style={completed ? { textDecoration: "line-through", color: "#999" } : {}}
                          >
                            {text}
                          </div>
                          <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                            <div><i className="bx bx-calendar"></i> Created At: {formatDate(createdAt)}</div>
                            {updatedAt && <div><i className="bx bx-time-five"></i> Updated At: {formatDate(updatedAt)}</div>}
                            </div>
                        </div>
                        
                        <div className="flex-shrink-0 ms-2 d-flex">
                          <button 
                            onClick={() => startEditingTask(id, text)}
                            className="btn btn-sm btn-link text-primary p-0 me-2"
                            disabled={completed}
                            title={completed ? "Cannot edit completed task" : "Edit task"}
                            style={{ opacity: completed ? 0.3 : 1 }}
                          >
                            <i className="bx bx-edit"></i>
                          </button>
                          <button 
                            onClick={() => removeTask(id, completed)}
                            className="btn btn-sm btn-link text-danger p-0"
                            disabled={!completed}
                            title={completed ? "Delete task" : "Complete task before deleting"}
                            style={{ opacity: completed ? 1 : 0.3 }}
                          >
                            <i className="bx bx-trash"></i>
                          </button>
                        </div>
                      </>
                    )}
                    
                    {editingTaskId === id && (
                      <div className="w-100">
                        <textarea
                          value={editTaskText}
                          onChange={handleEditTaskTextChange}
                          rows={2}
                          className="form-control form-control-sm mb-2"
                          autoFocus
                        />
                        <div className="d-flex gap-2">
                          <button 
                            onClick={() => saveEditedTask(id)} 
                            className="btn btn-success btn-sm flex-grow-1"
                          >
                            <i className="bx bx-check"></i> Save
                          </button>
                          <button 
                            onClick={cancelEditingTask} 
                            className="btn btn-light btn-sm"
                          >
                            <i className="bx bx-x"></i> Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodoList;
