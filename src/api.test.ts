import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTasks, addTask, updateTask } from './api';

describe('Task API Priority Handling', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should add a task with default medium priority', () => {
    const task = addTask('Test Task');
    expect(task.priority).toBe('medium');
    expect(getTasks()[0].priority).toBe('medium');
  });

  it('should add a task with a specified valid priority', () => {
    const highTask = addTask('High Priority Task', 'high');
    expect(highTask.priority).toBe('high');

    const lowTask = addTask('Low Priority Task', 'low');
    expect(lowTask.priority).toBe('low');

    const tasks = getTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks.find(t => t.title === 'High Priority Task')?.priority).toBe('high');
    expect(tasks.find(t => t.title === 'Low Priority Task')?.priority).toBe('low');
  });

  it('should default to medium priority if invalid priority is provided when adding', () => {
    const invalidTask = addTask('Invalid Priority Task', 'invalid-priority' as any);
    expect(invalidTask.priority).toBe('medium');
    expect(getTasks()[0].priority).toBe('medium');
  });

  it('should update a task priority to a valid priority', () => {
    const task = addTask('Update Task', 'low');
    const updatedTasks = updateTask(task.id, { priority: 'high' });
    const updatedTask = updatedTasks.find(t => t.id === task.id);
    expect(updatedTask?.priority).toBe('high');
    expect(getTasks().find(t => t.id === task.id)?.priority).toBe('high');
  });

  it('should fallback to medium if updated with invalid priority', () => {
    const task = addTask('Update Invalid Task', 'low');
    const updatedTasks = updateTask(task.id, { priority: 'super-high' as any });
    const updatedTask = updatedTasks.find(t => t.id === task.id);
    expect(updatedTask?.priority).toBe('medium');
    expect(getTasks().find(t => t.id === task.id)?.priority).toBe('medium');
  });

  it('should handle missing priority from local storage by defaulting to medium', () => {
    // Manually set an invalid task in localStorage
    const invalidTask = { id: '123', title: 'Old Task', completed: false }; // Missing priority
    localStorage.setItem('tasks', JSON.stringify([invalidTask]));

    const tasks = getTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].priority).toBe('medium');
  });
});
