import { describe, it, expect } from 'vitest';
import { sortTasks } from './sorting';
import type { Task } from '../api';

describe('sortTasks', () => {
  const mockTasks: Task[] = [
    { id: '1', title: 'Task 1', completed: false, priority: 'medium', creationDate: '2023-01-01T10:00:00Z', lastUpdatedAt: '2023-01-01T10:00:00Z' },
    { id: '2', title: 'Task 2', completed: false, priority: 'high', creationDate: '2023-01-02T10:00:00Z', lastUpdatedAt: '2023-01-02T11:00:00Z' },
    { id: '3', title: 'Task 3', completed: false, priority: 'low', creationDate: '2023-01-01T12:00:00Z', lastUpdatedAt: '2023-01-01T12:00:00Z' },
  ];

  it('sorts by creation date newest first', () => {
    const sorted = sortTasks(mockTasks, 'creation-newest');
    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('1');
  });

  it('sorts by creation date oldest first', () => {
    const sorted = sortTasks(mockTasks, 'creation-oldest');
    expect(sorted[0].id).toBe('1');
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('2');
  });

  it('sorts by last updated date newest first', () => {
    const sorted = sortTasks(mockTasks, 'updated-newest');
    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('1');
  });

  it('sorts by last updated date oldest first', () => {
    const sorted = sortTasks(mockTasks, 'updated-oldest');
    expect(sorted[0].id).toBe('1');
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('2');
  });

  it('handles missing dates by treating them as earliest possible date', () => {
    const tasksWithMissingDates: Task[] = [
      { id: '1', title: 'No Date', completed: false, priority: 'medium' },
      { id: '2', title: 'With Date', completed: false, priority: 'medium', creationDate: '2023-01-01T10:00:00Z' },
    ];

    const sortedNewest = sortTasks(tasksWithMissingDates, 'creation-newest');
    expect(sortedNewest[0].id).toBe('2');
    expect(sortedNewest[1].id).toBe('1');

    const sortedOldest = sortTasks(tasksWithMissingDates, 'creation-oldest');
    expect(sortedOldest[0].id).toBe('1');
    expect(sortedOldest[1].id).toBe('2');
  });
});
