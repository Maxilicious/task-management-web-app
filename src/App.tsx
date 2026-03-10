import { useState, useEffect } from 'react';
import { getTasks, addTask, updateTask, deleteTask } from './api';
import type { Task, Priority } from './api';
import { getThemePreference, setThemePreference } from './utils/theme';
import { sortTasks, type SortOption } from './utils/sorting';
import { exportTasksToCSV } from './utils/csvExport';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('creation-newest');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(getThemePreference());

  useEffect(() => {
    setTasks(getTasks());
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isDarkMode') {
        setIsDarkMode(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = isDarkMode ? '#1a1a1a' : 'white';
    document.body.style.margin = '0';
    document.body.style.transition = 'background-color 0.3s';
  }, [isDarkMode]);

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

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    setThemePreference(newMode);
  };

  const filteredAndSortedTasks = sortTasks(
    tasks.filter(task => filterPriority === 'all' || task.priority === filterPriority),
    sortBy
  );

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'low': return isDarkMode ? '#4caf50' : '#006600';
      case 'medium': return isDarkMode ? '#ffb74d' : '#8c5d00';
      case 'high': return isDarkMode ? '#ff5252' : '#c00000';
      default: return isDarkMode ? '#ccc' : 'black';
    }
  };

  const theme = {
    bg: isDarkMode ? '#1a1a1a' : 'white',
    containerBg: isDarkMode ? '#2d2d2d' : 'white',
    text: isDarkMode ? '#f0f0f0' : '#333',
    secondaryText: isDarkMode ? '#aaa' : '#555',
    border: isDarkMode ? '#444' : '#ccc',
    inputBg: isDarkMode ? '#333' : 'white',
    listItemBg: isDarkMode ? '#2d2d2d' : 'white',
    listItemCompletedBg: isDarkMode ? '#252525' : '#f9f9f9',
    listItemBorder: isDarkMode ? '#444' : '#eee',
    buttonPrimary: '#007bff',
    buttonDelete: '#dc3545',
    buttonExport: isDarkMode ? '#34c759' : '#1e7e34',
  };

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: '100vh', padding: '40px 20px', transition: 'background-color 0.3s' }}>
      <div style={{
        fontFamily: 'sans-serif',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: theme.containerBg,
        color: theme.text,
        border: `1px solid ${theme.border}`,
        borderRadius: '8px',
        boxShadow: isDarkMode ? '0 2px 10px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.3s'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, color: theme.text }}>Task Manager</h1>
          <button
            onClick={toggleTheme}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              backgroundColor: isDarkMode ? '#444' : '#eee',
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>

        <form onSubmit={handleAddTask} style={{ display: 'flex', marginBottom: '20px' }}>
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..."
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '16px',
              backgroundColor: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '4px 0 0 4px',
              outline: 'none'
            }}
          />
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
            style={{
              padding: '10px',
              fontSize: '16px',
              backgroundColor: theme.inputBg,
              color: theme.text,
              borderTop: `1px solid ${theme.border}`,
              borderRight: `1px solid ${theme.border}`,
              borderBottom: `1px solid ${theme.border}`,
              borderLeft: 'none',
              outline: 'none'
            }}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: theme.buttonPrimary,
              color: 'white',
              border: 'none',
              borderRadius: '0 4px 4px 0',
              cursor: 'pointer'
            }}
          >
            Add
          </button>
        </form>

        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <button
            onClick={() => exportTasksToCSV(filteredAndSortedTasks)}
            style={{
              padding: '8px 12px',
              backgroundColor: theme.buttonExport,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📥 Export to CSV
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label htmlFor="priority-filter" style={{ marginRight: '8px', fontSize: '14px', color: theme.secondaryText }}>Filter by Priority:</label>
              <select
                id="priority-filter"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as Priority | 'all')}
                style={{
                  padding: '8px',
                  fontSize: '14px',
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
                  outline: 'none'
                }}
              >
                <option value="all">All Priorities</option>
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label htmlFor="sort-by" style={{ marginRight: '8px', fontSize: '14px', color: theme.secondaryText }}>Sort by:</label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                style={{
                  padding: '8px',
                  fontSize: '14px',
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
                  outline: 'none'
                }}
              >
                <option value="creation-newest">Creation Date (Newest First)</option>
                <option value="creation-oldest">Creation Date (Oldest First)</option>
                <option value="updated-newest">Last Updated (Recently Updated)</option>
                <option value="updated-oldest">Last Updated (Least Recently Updated)</option>
              </select>
            </div>
          </div>
        </div>

        {filteredAndSortedTasks.length === 0 ? (
          <p style={{ textAlign: 'center', color: theme.secondaryText }}>
            {tasks.length === 0 ? 'No tasks yet. Add one above!' : 'No tasks match the selected filter.'}
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {filteredAndSortedTasks.map((task) => (
              <li
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px',
                  borderBottom: `1px solid ${theme.listItemBorder}`,
                  backgroundColor: task.completed ? theme.listItemCompletedBg : theme.listItemBg,
                  transition: 'background-color 0.2s'
                }}
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggleTask(task.id)}
                  style={{ marginRight: '15px', cursor: 'pointer', transform: 'scale(1.2)' }}
                />
                <span style={{
                  flex: 1,
                  textDecoration: task.completed ? 'line-through' : 'none',
                  color: task.completed ? (isDarkMode ? '#666' : '#888') : theme.text,
                  fontSize: '18px'
                }}>
                  {task.title}
                  <span style={{ marginLeft: '10px', fontSize: '14px', fontWeight: 'bold', color: getPriorityColor(task.priority) }}>
                    [{task.priority.toUpperCase()}]
                  </span>
                </span>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  style={{
                    marginLeft: '10px',
                    padding: '5px 10px',
                    backgroundColor: theme.buttonDelete,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
