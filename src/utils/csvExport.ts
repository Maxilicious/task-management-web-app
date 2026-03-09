import type { Task } from '../api';

const headers = [
  'Task ID',
  'Title',
  'Completed',
  'Priority',
  'Delegated By',
  'Assigned To',
  'Original Request Link',
  'Delegated At',
  'Last Updated At',
  'Estimated Completion Date',
  'PR URL',
  'PR Status',
  'Status',
  'Creation Date'
];

const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (e) {
    return dateString;
  }
};

const escapeCSVValue = (value: any) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const exportTasksToCSV = (tasks: Task[]) => {
  const csvRows = [];

  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const task of tasks) {
    const row = [
      escapeCSVValue(task.id),
      escapeCSVValue(task.title),
      escapeCSVValue(task.completed),
      escapeCSVValue(task.priority),
      escapeCSVValue(task.delegatedBy),
      escapeCSVValue(task.assignedTo?.join(', ')),
      escapeCSVValue(task.originalRequestLink),
      escapeCSVValue(formatDate(task.delegatedAt)),
      escapeCSVValue(formatDate(task.lastUpdatedAt)),
      escapeCSVValue(formatDate(task.estimatedCompletionDate)),
      escapeCSVValue(task.prUrl),
      escapeCSVValue(task.prStatus),
      escapeCSVValue(task.status),
      escapeCSVValue(formatDate(task.creationDate)),
    ];
    csvRows.push(row.join(','));
  }

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `tasks_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
