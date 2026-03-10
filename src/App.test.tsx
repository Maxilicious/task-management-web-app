import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import App from './App';

describe('App Component Priority Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders a task with medium priority by default', async () => {
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

  it('creates tasks with low, medium, and high priorities and sets correct colors', async () => {
    render(<App />);

    const input = screen.getByPlaceholderText('Add a new task...');
    const select = screen.getAllByRole('combobox')[0]; // First select is for adding tasks
    const addButton = screen.getByText('Add');

    // Add High priority
    fireEvent.change(input, { target: { value: 'High Task' } });
    fireEvent.change(select, { target: { value: 'high' } });
    fireEvent.click(addButton);

    const highPriorityBadge = await screen.findByText('[HIGH]');
    expect(highPriorityBadge).toBeInTheDocument();
    expect(highPriorityBadge).toHaveStyle({ color: 'rgb(192, 0, 0)' });

    // Add Low priority
    fireEvent.change(input, { target: { value: 'Low Task' } });
    fireEvent.change(select, { target: { value: 'low' } });
    fireEvent.click(addButton);

    const lowPriorityBadge = await screen.findByText('[LOW]');
    expect(lowPriorityBadge).toBeInTheDocument();
    expect(lowPriorityBadge).toHaveStyle({ color: 'rgb(0, 102, 0)' });

    // Ensure state resets to medium default
    fireEvent.change(input, { target: { value: 'Default Task Again' } });
    // Don't change select, so it should be medium
    fireEvent.click(addButton);

    const defaultMediumPriorityBadge = await screen.findAllByText('[MEDIUM]');
    // Use the last one added
    const lastMediumBadge = defaultMediumPriorityBadge[defaultMediumPriorityBadge.length - 1];
    expect(lastMediumBadge).toBeInTheDocument();
    expect(lastMediumBadge).toHaveStyle({ color: 'rgb(140, 93, 0)' });
  });

  it('filters tasks by priority', async () => {
    render(<App />);

    const input = screen.getByPlaceholderText('Add a new task...');
    const select = screen.getAllByRole('combobox')[0]; // First select is for adding tasks
    const addButton = screen.getByText('Add');

    // Add High priority task
    fireEvent.change(input, { target: { value: 'High Task' } });
    fireEvent.change(select, { target: { value: 'high' } });
    fireEvent.click(addButton);

    // Add Low priority task
    fireEvent.change(input, { target: { value: 'Low Task' } });
    fireEvent.change(select, { target: { value: 'low' } });
    fireEvent.click(addButton);

    // Initial state: both tasks should be visible
    expect(screen.getByText('High Task')).toBeInTheDocument();
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

    // Filter by All Priorities
    fireEvent.change(filterSelect, { target: { value: 'all' } });
    expect(screen.getByText('High Task')).toBeInTheDocument();
    expect(screen.getByText('Low Task')).toBeInTheDocument();
  });

  it('shows message when no tasks match filter', async () => {
    render(<App />);

    const input = screen.getByPlaceholderText('Add a new task...');
    const addButton = screen.getByText('Add');

    // Add Medium priority task
    fireEvent.change(input, { target: { value: 'Medium Task' } });
    fireEvent.click(addButton);

    const filterSelect = screen.getByLabelText('Filter by Priority:');

    // Filter by High Priority (should be empty)
    fireEvent.change(filterSelect, { target: { value: 'high' } });
    expect(screen.queryByText('Medium Task')).not.toBeInTheDocument();
    expect(screen.getByText('No tasks match the selected filter.')).toBeInTheDocument();
  });
});
