import { createApp } from 'json-server/lib/app.js';
import { JSONFilePreset } from 'lowdb/node';

const defaultData = { tasks: [] };
const db = await JSONFilePreset('backend/db.json', defaultData);

const app = createApp(db);

// Insert custom route BEFORE createApp's default routes if possible,
// but createApp already adds many routes.
// Let's try to use the underlying tinyhttp app's ability to prepend or just use a new app.

import { App } from '@tinyhttp/app';
import { json } from 'milliparsec';
import { cors } from '@tinyhttp/cors';

const customApp = new App();
customApp.use(json());
customApp.use(cors());

customApp.post('/suggest-tasks', (req, res) => {
  const { title } = req.body;
  let suggestions = ["Research requirements", "Design solution", "Implementation", "Write tests"];

  const titleLower = (title || "").toLowerCase();
  if (titleLower.includes('feature')) {
    suggestions = ["Requirement gathering", "System design", "Frontend development", "Backend development", "Unit testing"];
  } else if (titleLower.includes('bug')) {
    suggestions = ["Reproduce issue", "Debug code", "Apply fix", "Verify fix"];
  } else if (titleLower.includes('refactor')) {
    suggestions = ["Identify code smells", "Plan refactoring", "Execute changes", "Regression testing"];
  }

  res.json(suggestions);
});

// Mount the json-server app
customApp.use(app);

customApp.listen(3001, () => {
  console.log('JSON Server with custom routes is running on port 3001');
});
