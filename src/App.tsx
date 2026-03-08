import { useState, useEffect } from 'react';
import { getTasks, addTask, updateTask, deleteTask } from './api';
import type { Task, Priority } from './api';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');

  useEffect(() => {
    setTasks(getTasks());
  }, []);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addTask(newTaskTitle.trim(), newTaskPriority);
    setTasks(getTasks());
    setNewTaskTitle('');
    setNewTaskPriority('medium');
  };

  const handleToggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      updateTask(id, { completed: !task.completed });
      setTasks(getTasks());
    }
  };

  const handleDeleteTask = (id: string) => {
    deleteTask(id);
    setTasks(getTasks());
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'low': return 'green';
      case 'medium': return 'orange';
      case 'high': return 'red';
      default: return 'black';
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>Task Manager</h1>

      <form onSubmit={handleAddTask} style={{ display: 'flex', marginBottom: '20px' }}>
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a new task..."
          style={{ flex: 1, padding: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px 0 0 4px', outline: 'none' }}
        />
        <select
          value={newTaskPriority}
          onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
          style={{ padding: '10px', fontSize: '16px', border: '1px solid #ccc', borderLeft: 'none', outline: 'none' }}
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
        <button
          type="submit"
          style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer' }}
        >
          Add
        </button>
      </form>

      {tasks.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#777' }}>No tasks yet. Add one above!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {tasks.map((task) => (
            <li
              key={task.id}
              style={{ display: 'flex', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee', backgroundColor: task.completed ? '#f9f9f9' : 'white' }}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggleTask(task.id)}
                style={{ marginRight: '15px', cursor: 'pointer', transform: 'scale(1.2)' }}
              />
              <span style={{ flex: 1, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? '#888' : '#000', fontSize: '18px' }}>
                {task.title}
                <span style={{ marginLeft: '10px', fontSize: '14px', fontWeight: 'bold', color: getPriorityColor(task.priority) }}>
                  [{task.priority.toUpperCase()}]
                </span>
              </span>
              <button
                onClick={() => handleDeleteTask(task.id)}
                style={{ marginLeft: '10px', padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
