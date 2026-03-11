import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import App from './App';

describe('App Component Priority Integration', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    localStorage.clear();
    mockFetch.mockReset();
    // Default mock for initial getTasks
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('renders a task with medium priority by default', async () => {
    const newTask = {
      id: '1',
      title: 'Test Default Priority',
      completed: false,
      priority: 'medium',
      status: 'todo',
      creationDate: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    };

    // 1. Initial load (GET) - handled by default mock
    // 2. addTask (POST)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // for initial load if it hasn't happened
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => newTask }); // POST
    mockFetch.mockResolvedValue({ ok: true, json: async () => [newTask] }); // All subsequent GETs

    render(<App />);

    const input = screen.getByPlaceholderText('Add a new task...');
    const addButton = screen.getByText('Add');

    fireEvent.change(input, { target: { value: 'Test Default Priority' } });
    fireEvent.click(addButton);

    // Default priority should be 'medium', color should be #8c5d00
    const priorityBadge = await screen.findByText('[MEDIUM]');
    expect(priorityBadge).toBeInTheDocument();
    expect(priorityBadge).toHaveStyle({ color: 'rgb(140, 93, 0)' });
  });

  it('filters tasks by priority', async () => {
    const highTask = { id: '1', title: 'High Task', priority: 'high', status: 'todo' };
    const lowTask = { id: '2', title: 'Low Task', priority: 'low', status: 'todo' };

    // Mock initial load with tasks
    mockFetch.mockResolvedValue({ ok: true, json: async () => [highTask, lowTask] });

    render(<App />);

    await waitFor(() => expect(screen.getByText('High Task')).toBeInTheDocument());
    expect(screen.getByText('Low Task')).toBeInTheDocument();

    const filterSelect = screen.getByLabelText('Filter by Priority:');

    // Filter by High Priority
    fireEvent.change(filterSelect, { target: { value: 'high' } });
    expect(screen.getByText('High Task')).toBeInTheDocument();
    expect(screen.queryByText('Low Task')).not.toBeInTheDocument();

    // Filter by Low Priority
    fireEvent.change(filterSelect, { target: { value: 'low' } });
    expect(screen.queryByText('High Task')).not.toBeInTheDocument();
    expect(screen.getByText('Low Task')).toBeInTheDocument();
  });

  it('toggles Delegated Tasks view', async () => {
    const winstonTask = { id: '1', title: 'Winston Task', priority: 'medium', status: 'todo', delegatedBy: 'winston' };
    const otherTask = { id: '2', title: 'Other Task', priority: 'medium', status: 'todo' };

    mockFetch.mockResolvedValue({ ok: true, json: async () => [winstonTask, otherTask] });

    render(<App />);

    await waitFor(() => expect(screen.getByText('Winston Task')).toBeInTheDocument());
    expect(screen.getByText('Other Task')).toBeInTheDocument();

    const toggleButton = screen.getByText('👤 Delegated Tasks');
    fireEvent.click(toggleButton);

    expect(screen.getByText("Orchestrator's Dashboard")).toBeInTheDocument();
    expect(screen.getByText('Winston Task')).toBeInTheDocument();
    expect(screen.queryByText('Other Task')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('📋 Show All Tasks'));
    expect(screen.getByText('Task Manager')).toBeInTheDocument();
    expect(screen.getByText('Other Task')).toBeInTheDocument();
  });
});
