import { useState, useEffect, useRef } from 'react';
import { getTasks, addTask, updateTask, deleteTask, suggestTasks } from './api';
import type { Task, Priority, TaskStatus } from './api';
import { getThemePreference, setThemePreference } from './utils/theme';
import { sortTasks, type SortOption } from './utils/sorting';
import { exportTasksToCSV } from './utils/csvExport';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [sortBy, setSortBy] = useState<SortOption>('creation-newest');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(getThemePreference());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showDelegatedTasksOnly, setShowDelegatedTasksOnly] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Persistent Filter Bar States
  const [showFilterBar, setShowFilterBar] = useState<boolean>(() => {
    const saved = localStorage.getItem('showFilterBar');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<TaskStatus | 'all'>(() => {
    const saved = localStorage.getItem('tm_filter_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.status || 'all';
      } catch (e) { return 'all'; }
    }
    return 'all';
  });

  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<'me' | 'all'>(() => {
    const saved = localStorage.getItem('tm_filter_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.assignee || 'all';
      } catch (e) { return 'all'; }
    }
    return 'all';
  });

  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<Priority | 'all'>(() => {
    const saved = localStorage.getItem('tm_filter_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.priority || 'all';
      } catch (e) { return 'all'; }
    }
    return 'all';
  });

  const [dueDateRangeFilter, setDueDateRangeFilter] = useState<'all' | 'today' | 'this_week' | 'no_due_date'>(() => {
    const saved = localStorage.getItem('tm_filter_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.dueDateRange || 'all';
      } catch (e) { return 'all'; }
    }
    return 'all';
  });

  useEffect(() => {
    localStorage.setItem('showFilterBar', JSON.stringify(showFilterBar));
  }, [showFilterBar]);

  useEffect(() => {
    const filterState = {
      status: selectedStatusFilter,
      assignee: selectedAssigneeFilter,
      priority: selectedPriorityFilter,
      dueDateRange: dueDateRangeFilter,
    };
    localStorage.setItem('tm_filter_state', JSON.stringify(filterState));
  }, [selectedStatusFilter, selectedAssigneeFilter, selectedPriorityFilter, dueDateRangeFilter]);

  // Search and Selection States
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('tm_search_query') || '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    localStorage.setItem('tm_search_query', searchQuery);
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const addTaskInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpdateTaskTitle = async (id: string) => {
    if (!editingTitle.trim()) {
      setEditingTaskId(null);
      return;
    }
    const updatedTasks = await updateTask(id, { title: editingTitle.trim() });
    setTasks(updatedTasks);
    setEditingTaskId(null);
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    setThemePreference(newMode);
  };

  const fuzzyMatch = (text: string, query: string) => {
    if (!query) return true;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let queryIndex = 0;
    for (let textIndex = 0; textIndex < lowerText.length && queryIndex < lowerQuery.length; textIndex++) {
      if (lowerText[textIndex] === lowerQuery[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === lowerQuery.length;
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Simple highlighting for exact substring matches or first match for fuzzy-like feeling
    // As per requirement: "Highlight the matching terms within the rendered task.title using <mark> tags"
    const index = lowerText.indexOf(lowerQuery);
    if (index !== -1) {
      parts.push(text.substring(0, index));
      parts.push(<mark key="match" style={{ backgroundColor: '#ffd54f', color: 'black', borderRadius: '2px', padding: '0 2px' }}>{text.substring(index, index + query.length)}</mark>);
      parts.push(text.substring(index + query.length));
    } else {
      return <span>{text}</span>;
    }
    return <span>{parts}</span>;
  };

  const filteredAndSortedTasks = sortTasks(
    tasks.filter(task => {
      const matchesPriority = selectedPriorityFilter === 'all' || task.priority === selectedPriorityFilter;
      const matchesDelegation = !showDelegatedTasksOnly || task.delegatedBy === 'winston';
      const matchesSearch = fuzzyMatch(task.title, debouncedSearchQuery);

      const matchesStatus = selectedStatusFilter === 'all'
        ? true
        : task.status === selectedStatusFilter;

      const matchesAssignee = selectedAssigneeFilter === 'all'
        ? true
        : (task.assignedTo?.some(a => a.toLowerCase() === 'me' || a.toLowerCase() === 'currentUser'));

      // Due Date filtering logic
      let matchesDate = true;
      if (dueDateRangeFilter !== 'all') {
        if (dueDateRangeFilter === 'no_due_date') {
          matchesDate = !task.dueDate;
        } else if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);

          if (dueDateRangeFilter === 'today') {
            matchesDate = dueDate >= now && dueDate <= endOfDay;
          } else if (dueDateRangeFilter === 'this_week') {
            const endOfWeek = new Date(now);
            endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
            endOfWeek.setHours(23, 59, 59, 999);
            matchesDate = dueDate >= now && dueDate <= endOfWeek;
          }
        } else {
          matchesDate = false;
        }
      }

      return matchesPriority && matchesDelegation && matchesSearch && matchesStatus && matchesAssignee && matchesDate;
    }),
    sortBy
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

      if (isInputFocused && !e.ctrlKey && !e.metaKey) {
        if (target.id === 'global-search') {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => Math.min(prev + 1, filteredAndSortedTasks.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => Math.max(prev - 1, 0));
          } else if (e.key === 'Enter' && highlightedIndex >= 0) {
            e.preventDefault();
            const task = filteredAndSortedTasks[highlightedIndex];
            if (task) {
              setSelectedTaskId(task.id);
            }
          }
        }
        return;
      }

      // Global keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+K to toggle the filter bar
        if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setShowFilterBar(prev => !prev);
          return;
        }

        // Ctrl+N to add a new task (focuses input, deselects current task)
        if (e.key.toLowerCase() === 'n') {
          if (!isInputFocused) {
            e.preventDefault();
            document.getElementById('new-task-title-input')?.focus();
            setSelectedTaskId(null);
          }
          return;
        }

        // Ctrl+D to delete the currently selected task
        if (e.key.toLowerCase() === 'd') {
          if (!isInputFocused && selectedTaskId) {
            e.preventDefault();
            if (window.confirm('Are you sure you want to delete the selected task?')) {
              handleDeleteTask(selectedTaskId);
              setSelectedTaskId(null);
            }
          }
          return;
        }
      }

      switch (e.key.toLowerCase()) {
        case '/':
          if (!isInputFocused) {
            e.preventDefault();
            searchInputRef.current?.focus();
          }
          break;
        case 'k':
          if (!isInputFocused) {
            e.preventDefault();
            searchInputRef.current?.focus();
          }
          break;
        case 'f':
          if (!isInputFocused) {
            e.preventDefault();
            setShowFilterBar(prev => !prev);
          }
          break;
        case '?':
          if (!isInputFocused) {
            e.preventDefault();
            setShowHelpModal(prev => !prev);
          }
          break;
        case 'delete':
          if (!isInputFocused && selectedTaskId) {
            e.preventDefault();
            const task = tasks.find(t => t.id === selectedTaskId);
            if (task && window.confirm(`Delete task "${task.title}"?`)) {
              handleDeleteTask(selectedTaskId);
              setSelectedTaskId(null);
            }
          }
          break;
        case 'e':
          if (!isInputFocused && selectedTaskId) {
            e.preventDefault();
            setEditingTaskId(selectedTaskId);
            const task = tasks.find(t => t.id === selectedTaskId);
            if (task) {
              setEditingTitle(task.title);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskId, tasks, showFilterBar, filteredAndSortedTasks, highlightedIndex]);

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
    <div
      onClick={() => setSelectedTaskId(null)}
      style={{ backgroundColor: theme.bg, minHeight: '100vh', padding: '40px 20px', transition: 'background-color 0.3s' }}
    >
      {showHelpModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }} onClick={() => setShowHelpModal(false)}>
          <div style={{
            backgroundColor: theme.containerBg,
            color: theme.text,
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Keyboard Shortcuts</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {[
                { key: '/', desc: 'Focus search bar' },
                { key: 'Ctrl+K', desc: 'Toggle filter bar' },
                { key: '↑/↓', desc: 'Navigate search results' },
                { key: 'Enter', desc: 'Select task' },
                { key: 'Ctrl+N', desc: 'Add new task' },
                { key: 'E', desc: 'Edit selected task' },
                { key: 'Ctrl+D', desc: 'Delete selected task' },
                { key: '?', desc: 'Show help' },
              ].map(item => (
                <li key={item.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${theme.border}` }}>
                  <kbd style={{
                    backgroundColor: isDarkMode ? '#444' : '#eee',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: `1px solid ${theme.border}`,
                    fontWeight: 'bold'
                  }}>{item.key}</kbd>
                  <span>{item.desc}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowHelpModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '20px',
                backgroundColor: theme.buttonPrimary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
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

        <form onSubmit={handleAddTask} style={{ display: 'flex', marginBottom: '10px' }}>
          <input
            id="new-task-title-input"
            type="text"
            ref={addTaskInputRef}
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

        {showFilterBar && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            marginBottom: '15px',
            padding: '15px',
            backgroundColor: isDarkMode ? '#333' : '#f8f9fa',
            borderRadius: '6px',
          }} aria-label="Task Filters">
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.secondaryText, minWidth: '60px' }}>Status:</span>
              {(['all', 'todo', 'in_progress', 'awaiting_review', 'done'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedStatusFilter(status)}
                  aria-pressed={selectedStatusFilter === status}
                  aria-controls="task-list"
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    borderRadius: '16px',
                    border: `1px solid ${selectedStatusFilter === status ? theme.buttonPrimary : theme.border}`,
                    backgroundColor: selectedStatusFilter === status ? theme.buttonPrimary : (isDarkMode ? '#444' : 'white'),
                    color: selectedStatusFilter === status ? 'white' : theme.text,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.secondaryText, minWidth: '60px' }}>Priority:</span>
              {(['all', 'low', 'medium', 'high'] as const).map(priority => (
                <button
                  key={priority}
                  onClick={() => setSelectedPriorityFilter(priority)}
                  aria-pressed={selectedPriorityFilter === priority}
                  aria-controls="task-list"
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    borderRadius: '16px',
                    border: `1px solid ${selectedPriorityFilter === priority ? theme.buttonPrimary : theme.border}`,
                    backgroundColor: selectedPriorityFilter === priority ? theme.buttonPrimary : (isDarkMode ? '#444' : 'white'),
                    color: selectedPriorityFilter === priority ? 'white' : theme.text,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.secondaryText, minWidth: '60px' }}>Assignee:</span>
              {(['all', 'me'] as const).map(assignee => (
                <button
                  key={assignee}
                  onClick={() => setSelectedAssigneeFilter(assignee)}
                  aria-pressed={selectedAssigneeFilter === assignee}
                  aria-controls="task-list"
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    borderRadius: '16px',
                    border: `1px solid ${selectedAssigneeFilter === assignee ? theme.buttonPrimary : theme.border}`,
                    backgroundColor: selectedAssigneeFilter === assignee ? theme.buttonPrimary : (isDarkMode ? '#444' : 'white'),
                    color: selectedAssigneeFilter === assignee ? 'white' : theme.text,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {assignee === 'me' ? 'Mine' : 'All'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.secondaryText, minWidth: '60px' }}>Due Date:</span>
              {(['all', 'today', 'this_week', 'no_due_date'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setDueDateRangeFilter(range)}
                  aria-pressed={dueDateRangeFilter === range}
                  aria-controls="task-list"
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    borderRadius: '16px',
                    border: `1px solid ${dueDateRangeFilter === range ? theme.buttonPrimary : theme.border}`,
                    backgroundColor: dueDateRangeFilter === range ? theme.buttonPrimary : (isDarkMode ? '#444' : 'white'),
                    color: dueDateRangeFilter === range ? 'white' : theme.text,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {range.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatusFilter('all');
                setSelectedAssigneeFilter('all');
                setSelectedPriorityFilter('all');
                setDueDateRangeFilter('all');
              }}
              aria-label="Reset all filters"
              style={{
                alignSelf: 'flex-start',
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: 'transparent',
                color: theme.buttonDelete,
                border: `1px solid ${theme.buttonDelete}`,
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '5px'
              }}
            >
              Reset Filters
            </button>
          </div>
        )}

        <div style={{ marginBottom: '20px' }} role="search">
          <input
            id="global-search"
            type="text"
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks... (/)"
            aria-label="Search tasks"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              backgroundColor: theme.inputBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

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
          <ul id="task-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {filteredAndSortedTasks.map((task, index) => (
              <li
                key={task.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTaskId(task.id);
                  setHighlightedIndex(index);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px',
                  borderBottom: `1px solid ${theme.listItemBorder}`,
                  // Visual highlight for the selected task
                  backgroundColor: task.id === selectedTaskId
                    ? (isDarkMode ? '#3d3d3d' : '#e3f2fd')
                    : (index === highlightedIndex ? (isDarkMode ? '#333' : '#f0f0f0') : (task.completed ? theme.listItemCompletedBg : theme.listItemBg)),
                  borderLeft: task.id === selectedTaskId ? `4px solid ${theme.buttonPrimary}` : (index === highlightedIndex ? `4px solid ${isDarkMode ? '#666' : '#ccc'}` : 'none'),
                  boxShadow: task.id === selectedTaskId ? 'inset 0 0 0 1px ' + theme.buttonPrimary : 'none',
                  cursor: 'pointer',
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
                    {editingTaskId === task.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleUpdateTaskTitle(task.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateTaskTitle(task.id);
                          if (e.key === 'Escape') setEditingTaskId(null);
                        }}
                        style={{
                          flex: 1,
                          padding: '5px',
                          fontSize: '18px',
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
                          {highlightText(task.title, searchQuery)}
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
