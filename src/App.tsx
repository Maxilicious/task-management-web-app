import React, { useState, useEffect, useRef } from 'react';
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

  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'done'>(
    (localStorage.getItem('taskFilterStatus') as 'all' | 'open' | 'done') || 'all'
  );
  const [filterAssignee, setFilterAssignee] = useState<'all' | 'me'>(
    (localStorage.getItem('taskFilterAssignee') as 'all' | 'me') || 'all'
  );
  const [searchQuery, setSearchQuery] = useState(localStorage.getItem('taskSearchQuery') || '');
  const [isFilterBarVisible, setIsFilterBarVisible] = useState(
    localStorage.getItem('isFilterBarVisible') !== 'false'
  );
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const CURRENT_USER = 'winston';

  const fetchTasks = async () => {
    const fetchedTasks = await getTasks();
    setTasks(fetchedTasks);
  };

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

  useEffect(() => {
    localStorage.setItem('taskFilterStatus', filterStatus);
    localStorage.setItem('taskFilterAssignee', filterAssignee);
    localStorage.setItem('taskSearchQuery', searchQuery);
    localStorage.setItem('isFilterBarVisible', String(isFilterBarVisible));
  }, [filterStatus, filterAssignee, searchQuery, isFilterBarVisible]);

  useEffect(() => {
    const init = async () => {
      await fetchTasks();
    };
    init();
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
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault();
          setIsFilterBarVisible(true);
          setTimeout(() => searchInputRef.current?.focus(), 0);
          break;
        case 'n':
          e.preventDefault();
          newTaskInputRef.current?.focus();
          break;
        case 'f':
          setIsFilterBarVisible(prev => !prev);
          break;
        case '?':
          setIsHelpModalOpen(prev => !prev);
          break;
        case 'e':
          if (selectedTaskId) {
            const task = tasks.find(t => t.id === selectedTaskId);
            if (task) {
              setEditingTaskId(selectedTaskId);
              setEditingTitle(task.title);
            }
          }
          break;
        case 'd':
        case 'delete':
          if (selectedTaskId) {
            if (window.confirm('Are you sure you want to delete this task?')) {
              handleDeleteTask(selectedTaskId);
              setSelectedTaskId(null);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tasks, selectedTaskId, isFilterBarVisible]);

  useEffect(() => {
    document.body.style.backgroundColor = isDarkMode ? '#1a1a1a' : 'white';
    document.body.style.margin = '0';
    document.body.style.transition = 'background-color 0.3s';
  }, [isDarkMode]);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    setThemePreference(newMode);
  };

  const filteredAndSortedTasks = sortTasks(
    tasks.filter(task => {
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesDelegation = !showDelegatedTasksOnly || task.delegatedBy === 'winston';

      const matchesStatus = filterStatus === 'all'
        ? true
        : filterStatus === 'open' ? !task.completed : task.completed;

      const matchesAssignee = filterAssignee === 'all'
        ? true
        : task.assignedTo?.includes(CURRENT_USER);

      const matchesSearch = !searchQuery
        ? true
        : task.title.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesPriority && matchesDelegation && matchesStatus && matchesAssignee && matchesSearch;
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
      {isHelpModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme.containerBg,
            color: theme.text,
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            <button
              onClick={() => setIsHelpModalOpen(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                color: theme.text,
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              &times;
            </button>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Keyboard Shortcuts</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '15px 20px', alignItems: 'center' }}>
              {[
                { key: 'K', desc: 'Focus search bar' },
                { key: 'N', desc: 'Focus new task input' },
                { key: 'E', desc: 'Edit selected task' },
                { key: 'D / Del', desc: 'Delete selected task' },
                { key: 'F', desc: 'Toggle filter bar visibility' },
                { key: '?', desc: 'Toggle this help modal' }
              ].map(shortcut => (
                <React.Fragment key={shortcut.key}>
                  <kbd style={{
                    backgroundColor: theme.inputBg,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${theme.border}`,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    minWidth: '30px'
                  }}>{shortcut.key}</kbd>
                  <span>{shortcut.desc}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

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
            ref={newTaskInputRef}
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

        {isFilterBarVisible && (
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: isDarkMode ? '#333' : '#f8f9fa',
            borderRadius: '8px',
            border: `1px solid ${theme.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Status:</span>
              {(['all', 'open', 'done'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: filterStatus === status ? theme.buttonPrimary : 'transparent',
                    color: filterStatus === status ? 'white' : theme.text,
                    cursor: 'pointer',
                    fontSize: '12px',
                    textTransform: 'capitalize'
                  }}
                >
                  {status}
                </button>
              ))}

              <div style={{ width: '1px', height: '20px', backgroundColor: theme.border, margin: '0 5px' }} />

              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Assignee:</span>
              {(['all', 'me'] as const).map(assignee => (
                <button
                  key={assignee}
                  onClick={() => setFilterAssignee(assignee)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    border: `1px solid ${theme.border}`,
                    backgroundColor: filterAssignee === assignee ? theme.buttonPrimary : 'transparent',
                    color: filterAssignee === assignee ? 'white' : theme.text,
                    cursor: 'pointer',
                    fontSize: '12px',
                    textTransform: 'capitalize'
                  }}
                >
                  {assignee}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative' }}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks... (K)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '14px',
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: theme.secondaryText,
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  &times;
                </button>
              )}
            </div>
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
                onClick={() => setSelectedTaskId(task.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px',
                  borderBottom: `1px solid ${theme.listItemBorder}`,
                  backgroundColor: task.completed ? theme.listItemCompletedBg : theme.listItemBg,
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  outline: selectedTaskId === task.id ? `2px solid ${theme.buttonPrimary}` : 'none',
                  outlineOffset: '-2px',
                  zIndex: selectedTaskId === task.id ? 1 : 0,
                  position: 'relative'
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
                    {editingTaskId === task.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            if (editingTitle.trim()) {
                              const updatedTasks = await updateTask(task.id, { title: editingTitle.trim() });
                              setTasks(updatedTasks);
                            }
                            setEditingTaskId(null);
                          } else if (e.key === 'Escape') {
                            setEditingTaskId(null);
                          }
                        }}
                        autoFocus
                        style={{
                          flex: 1,
                          fontSize: '18px',
                          padding: '2px 5px',
                          backgroundColor: theme.inputBg,
                          color: theme.text,
                          border: `1px solid ${theme.buttonPrimary}`,
                          borderRadius: '4px',
                          outline: 'none'
                        }}
                      />
                    ) : (
                      <>
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
                      </>
                    )}
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
