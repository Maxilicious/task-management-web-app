import type { Task } from '../api';

export type SortOption = 'creation-newest' | 'creation-oldest' | 'updated-newest' | 'updated-oldest';

export const sortTasks = (tasks: Task[], sortBy: SortOption): Task[] => {
  return [...tasks].sort((a, b) => {
    const dateA = sortBy.startsWith('creation') ? a.creationDate : a.lastUpdatedAt;
    const dateB = sortBy.startsWith('creation') ? b.creationDate : b.lastUpdatedAt;

    const timeA = dateA ? new Date(dateA).getTime() : 0;
    const timeB = dateB ? new Date(dateB).getTime() : 0;

    if (sortBy.endsWith('newest')) {
      return timeB - timeA; // Descending: newest/most recent first
    } else {
      return timeA - timeB; // Ascending: oldest/least recent first
    }
  });
};
