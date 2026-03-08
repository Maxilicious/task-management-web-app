# CODEY.md — Task Management Web App

## Goal

A minimal, fast task management web app for the office. Users can create, view, complete, and delete tasks. Clean and functional — no bloat.

## Requirements

### Core (must have)
- [ ] Add a task (title required)
- [ ] List all tasks, newest first
- [ ] Mark a task complete/incomplete (toggle)
- [ ] Delete a task
- [ ] Tasks persist across page reloads (localStorage)

### Priority
- [ ] Priority field on each task: low / medium / high
- [ ] Visual colour coding by priority (low=green, medium=amber, high=red)
- [ ] Filter tasks by priority

### Polish
- [ ] Empty state message when no tasks
- [ ] Task count in header (e.g. "3 tasks, 1 complete")
- [ ] Keyboard shortcut: Enter to add task
- [ ] Animations on add/complete/delete (subtle)

## Tech stack

- React + Vite + TypeScript
- Inline styles only (no CSS frameworks)
- localStorage for persistence
- No backend

## Out of scope

- User accounts / auth
- Backend / database
- Due dates
- Task categories / tags
- Drag to reorder
