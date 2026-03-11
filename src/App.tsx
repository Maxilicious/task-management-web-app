import { useState, useEffect } from 'react';
import { getTasks, addTask, updateTask, deleteTask, suggestTasks } from './api';
import type { Task, Priority, TaskStatus } from './api';
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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showDelegatedTasksOnly, setShowDelegatedTasksOnly] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      const fetchedTasks = await getTasks();
      setTasks(fetchedTasks);
    };
    fetchTasks();
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

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    await addTask(newTaskTitle.trim(), newTaskPriority);
    const updatedTasks = await getTasks();
    setTasks(updatedTasks);
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setSuggestions([]);
  };

  const handleSuggestTasks = async () => {
    if (!newTaskTitle.trim()) return;
    setIsLoadingSuggestions(true);
    const newSuggestions = await suggestTasks(newTaskTitle.trim());
    setSuggestions(newSuggestions);
    setIsLoadingSuggestions(false);
  };

  const handleAddSuggestedTask = async (suggestion: string) => {
    await addTask(suggestion, 'medium');
    const updatedTasks = await getTasks();
    setTasks(updatedTasks);
    setSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      const updatedTasks = await updateTask(id, { completed: !task.completed });
      setTasks(updatedTasks);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const updatedTasks = await deleteTask(id);
    setTasks(updatedTasks);
  };

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    const updatedTasks = await updateTask(id, { status });
    setTasks(updatedTasks);
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    setThemePreference(newMode);
  };

  const filteredAndSortedTasks = sortTasks(
    tasks.filter(task => {
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesDelegation = !showDelegatedTasksOnly || task.delegatedBy === 'winston';
      return matchesPriority && matchesDelegation;
    }),
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
          <h1 style={{ margin: 0, color: theme.text }}>{showDelegatedTasksOnly ? "Orchestrator's Dashboard" : 'Task Manager'}</h1>
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

        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleSuggestTasks}
            disabled={isLoadingSuggestions || !newTaskTitle.trim()}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              backgroundColor: isDarkMode ? '#555' : '#e0e0e0',
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              cursor: (isLoadingSuggestions || !newTaskTitle.trim()) ? 'not-allowed' : 'pointer',
              opacity: (isLoadingSuggestions || !newTaskTitle.trim()) ? 0.6 : 1
            }}
          >
            {isLoadingSuggestions ? '⌛ Loading Suggestions...' : '💡 Suggest Sub-tasks'}
          </button>
        </div>

        {suggestions.length > 0 && (
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: isDarkMode ? '#383838' : '#f0f7ff',
            borderRadius: '8px',
            border: `1px solid ${isDarkMode ? '#555' : '#cce5ff'}`
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: theme.text }}>Suggested Next Steps:</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {suggestions.map((suggestion, index) => (
                <li key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '5px 0',
                  borderBottom: index === suggestions.length - 1 ? 'none' : `1px solid ${theme.listItemBorder}`
                }}>
                  <span style={{ fontSize: '14px', color: theme.text }}>{suggestion}</span>
                  <button
                    onClick={() => handleAddSuggestedTask(suggestion)}
                    style={{
                      padding: '2px 8px',
                      fontSize: '12px',
                      backgroundColor: theme.buttonPrimary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    + Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowDelegatedTasksOnly(!showDelegatedTasksOnly)}
              style={{
                padding: '8px 12px',
                backgroundColor: showDelegatedTasksOnly ? theme.buttonPrimary : (isDarkMode ? '#444' : '#eee'),
                color: showDelegatedTasksOnly ? 'white' : theme.text,
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showDelegatedTasksOnly ? '📋 Show All Tasks' : '👤 Delegated Tasks'}
            </button>
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
          </div>
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
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      textDecoration: task.completed ? 'line-through' : 'none',
                      color: task.completed ? (isDarkMode ? '#666' : '#888') : theme.text,
                      fontSize: '18px'
                    }}>
                      {task.title}
                    </span>
                    <span style={{ marginLeft: '10px', fontSize: '14px', fontWeight: 'bold', color: getPriorityColor(task.priority) }}>
                      [{task.priority.toUpperCase()}]
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '5px', fontSize: '12px', color: theme.secondaryText }}>
                    {task.assignedTo && task.assignedTo.length > 0 && (
                      <span>👤 Assigned to: {task.assignedTo.join(', ')}</span>
                    )}
                    {task.delegatedBy && (
                      <span>Delegated by: {task.delegatedBy}</span>
                    )}
                    {task.prUrl && (
                      <span>
                        PR: <a href={task.prUrl} target="_blank" rel="noopener noreferrer" style={{ color: theme.buttonPrimary }}>{task.prStatus || 'Link'}</a>
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: '5px', fontSize: '11px', color: theme.secondaryText, opacity: 0.8 }}>
                    <span>Created: {task.creationDate ? new Date(task.creationDate).toLocaleString() : 'N/A'}</span>
                    <span style={{ marginLeft: '10px' }}>Updated: {task.lastUpdatedAt ? new Date(task.lastUpdatedAt).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                  <select
                    value={task.status || 'todo'}
                    onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      backgroundColor: theme.inputBg,
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '4px',
                      outline: 'none'
                    }}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="awaiting_review">Awaiting Review</option>
                    <option value="done">Done</option>
                  </select>

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    style={{
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Test Merge 4
