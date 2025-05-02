import React, { useState, useEffect, ChangeEvent } from 'react';

// Define the Task interface
interface Task {
  id: number;
  text: string;
  completed: boolean;
  createdAt: string;
}

// Function to get tasks from localStorage
const getSavedTasks = (): Task[] => {
  const savedTasks = localStorage.getItem('tasks');
  return savedTasks ? JSON.parse(savedTasks) : [];
};

const TodoList: React.FC = () => {
  // State for todo list functionality
  const [tasks, setTasks] = useState<Task[]>(getSavedTasks());
  const [newTask, setNewTask] = useState<string>('');
  const [isAddingTask, setIsAddingTask] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isTodoCollapsed, setIsTodoCollapsed] = useState<boolean>(false);
  
  // State for task editing
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskText, setEditTaskText] = useState<string>('');

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);  

  // Clear status messages after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Clear error messages after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Format date for display
  const formatDate = (date: string): string => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Toggle collapse state of the todo list
  const toggleTodo = (): void => {
    setIsTodoCollapsed(prev => !prev);
  };

  // Add a new task
  const addTask = (): void => {
    if (!newTask.trim()) {
      setError('Task cannot be empty.');
      return;
    }

    const newTaskObject: Task = {
      id: Date.now(),
      text: newTask.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [newTaskObject, ...prev]);
    setNewTask('');
    setIsAddingTask(false);
    setStatusMessage('Task added successfully!');
  };

  // Remove a task
  const removeTask = (id: number, completed: boolean): void => {
    if (!completed) {
      setError('Please complete the task before removing it.');
      return;
    }

    setTasks(prev => prev.filter(task => task.id !== id));
    setStatusMessage('Task removed successfully!');
  };

  // Toggle completion status of a task
  const toggleTaskCompletion = (id: number, currentStatus: boolean): void => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
    setStatusMessage(currentStatus ? 'Task marked as incomplete.' : 'Task marked as complete!');
  };

  // Start editing a task
  const startEditingTask = (id: number, text: string): void => {
    setEditingTaskId(id);
    setEditTaskText(text);
  };

  // Save the edited task
  const saveEditedTask = (id: number): void => {
    if (!editTaskText.trim()) {
      setError('Task cannot be empty.');
      return;
    }

    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, text: editTaskText.trim() } : task
    ));
    setEditingTaskId(null);
    setEditTaskText('');
    setStatusMessage('Task updated successfully!');
  };

  // Cancel editing a task
  const cancelEditingTask = (): void => {
    setEditingTaskId(null);
    setEditTaskText('');
  };

  // Handler for text area changes
  const handleTaskTextChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setNewTask(e.target.value);
  };

  // Handler for edit text area changes
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
        {/* Add task button that shows when text area is hidden */}
        {!isAddingTask && (
          <button 
            onClick={() => setIsAddingTask(true)} 
            className="btn btn-primary btn-sm w-100 mb-3"
          >
            <i className="bx bx-plus"></i> Add New Task
          </button>
        )}

        {/* Text area that appears only when adding a task */}
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
              {tasks.map(({ id, text, completed, createdAt }) => (
                <li key={id} className="list-group-item px-0 py-2">
                  <div className="d-flex">
                    {/* Non-edit mode */}
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
                            <i className="bx bx-calendar"></i> {formatDate(createdAt)}
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
                    
                    {/* Edit mode */}
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