import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTasks, addTask, updateTask } from './api';

describe('Task API Priority Handling', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    localStorage.clear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('should add a task with default medium priority', async () => {
    const newTask = {
      id: '1',
      title: 'Test Task',
      completed: false,
      priority: 'medium',
      status: 'todo',
      creationDate: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => newTask,
    });

    // getTasks mock for when addTask calls it
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [newTask],
    });

    const task = await addTask('Test Task');
    expect(task.priority).toBe('medium');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [newTask],
    });
    const tasks = await getTasks();
    expect(tasks[0].priority).toBe('medium');
  });

  it('should add a task with a specified valid priority', async () => {
    const highTask = { id: '1', title: 'High Priority Task', priority: 'high', status: 'todo' };
    const lowTask = { id: '2', title: 'Low Priority Task', priority: 'low', status: 'todo' };

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => highTask }); // addTask 1
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [highTask] }); // getTasks in addTask 1
    await addTask('High Priority Task', 'high');

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => lowTask }); // addTask 2
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [highTask, lowTask] }); // getTasks in addTask 2
    await addTask('Low Priority Task', 'low');

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [highTask, lowTask] });
    const tasks = await getTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks.find(t => t.title === 'High Priority Task')?.priority).toBe('high');
    expect(tasks.find(t => t.title === 'Low Priority Task')?.priority).toBe('low');
  });

  it('should update a task priority to a valid priority', async () => {
    const initialTask = { id: '1', title: 'Update Task', priority: 'low', status: 'todo' };
    const updatedTask = { ...initialTask, priority: 'high' };

    mockFetch.mockResolvedValue({ ok: true, json: async () => [initialTask] });
    await getTasks(); // to populate initial state if needed, though getTasks is called inside updateTask

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [initialTask] }); // first getTasks in updateTask
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => updatedTask }); // PATCH
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [updatedTask] }); // second getTasks in updateTask

    const updatedTasks = await updateTask('1', { priority: 'high' });
    const resultTask = updatedTasks.find(t => t.id === '1');
    expect(resultTask?.priority).toBe('high');
  });
});
