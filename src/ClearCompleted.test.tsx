import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import App from './App';

describe('Clear Completed Tasks Functionality', () => {
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
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('shows the Clear Completed Tasks button only when there are completed tasks', async () => {
    const tasks = [
      { id: '1', title: 'Task 1', completed: false, priority: 'medium', status: 'todo' },
      { id: '2', title: 'Task 2', completed: true, priority: 'medium', status: 'done' },
    ];

    mockFetch.mockResolvedValue({ ok: true, json: async () => tasks });

    render(<App />);

    // Wait for the button to be visible
    await waitFor(() => {
        const button = screen.queryByText('Clear Completed Tasks');
        expect(button).toBeInTheDocument();
        expect(button).toHaveStyle({ display: 'block' });
    });
  });

  it('calls deleteTask for each completed task when the button is clicked and confirmed', async () => {
    const tasks = [
      { id: '1', title: 'Task 1', completed: true, priority: 'medium', status: 'done' },
      { id: '2', title: 'Task 2', completed: true, priority: 'medium', status: 'done' },
      { id: '3', title: 'Task 3', completed: false, priority: 'medium', status: 'todo' },
    ];

    mockFetch.mockResolvedValue({ ok: true, json: async () => tasks });

    render(<App />);

    const clearButton = await screen.findByText('Clear Completed Tasks');

    // Setup mocks for deletions and final fetch
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] }); // for DELETE and subsequent GET

    fireEvent.click(clearButton);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to clear all completed tasks? This action cannot be undone.');

    await waitFor(() => {
        // expect delete to be called for id 1 and 2
        const deleteCalls = mockFetch.mock.calls.filter(call => call[1]?.method === 'DELETE');
        expect(deleteCalls).toHaveLength(2);
    });
  });
});
