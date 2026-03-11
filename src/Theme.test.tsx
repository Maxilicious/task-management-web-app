import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import App from './App';

describe('Dark Mode Functionality', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    localStorage.clear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('toggles dark mode when button is clicked', async () => {
    render(<App />);

    const toggleButton = screen.getByText(/Dark Mode/i);

    // Initial state: Light Mode
    expect(screen.getByText(/🌙 Dark Mode/i)).toBeInTheDocument();

    const outerDiv = (await screen.findByText('Task Manager')).closest('div')?.parentElement?.parentElement;
    // toHaveStyle can sometimes be picky about colors, using rgb instead
    expect(outerDiv).toHaveStyle('background-color: rgb(255, 255, 255)');

    // Click to toggle to Dark Mode
    fireEvent.click(toggleButton);
    expect(screen.getByText(/☀️ Light Mode/i)).toBeInTheDocument();
    expect(outerDiv).toHaveStyle('background-color: rgb(26, 26, 26)'); // #1a1a1a

    // Click again to toggle back to Light Mode
    fireEvent.click(screen.getByText(/☀️ Light Mode/i));
    expect(screen.getByText(/🌙 Dark Mode/i)).toBeInTheDocument();
    expect(outerDiv).toHaveStyle('background-color: rgb(255, 255, 255)');
  });

  it('persists dark mode preference in localStorage', async () => {
    render(<App />);

    const toggleButton = screen.getByText(/Dark Mode/i);

    // Toggle to Dark Mode
    fireEvent.click(toggleButton);
    expect(localStorage.getItem('isDarkMode')).toBe('true');

    // Toggle back to Light Mode
    fireEvent.click(screen.getByText(/☀️ Light Mode/i));
    expect(localStorage.getItem('isDarkMode')).toBe('false');
  });

  it('loads dark mode preference from localStorage on initialization', async () => {
    localStorage.setItem('isDarkMode', 'true');
    render(<App />);

    expect(screen.getByText(/☀️ Light Mode/i)).toBeInTheDocument();
    const outerDiv = (await screen.findByText('Task Manager')).closest('div')?.parentElement?.parentElement;
    expect(outerDiv).toHaveStyle('background-color: rgb(26, 26, 26)'); // #1a1a1a
  });
});
