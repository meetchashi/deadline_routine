# Contributing

Open an issue for a bug report or feature suggestion. For bugs, include the Chrome version, steps to reproduce, and expected and actual behavior. Redact personal information from screenshots and logs.

## Local setup

1. Clone or download the repository.
2. Load the project folder at `chrome://extensions` using **Developer mode → Load unpacked**.
3. Edit the HTML, CSS, or JavaScript directly. No dependencies or build step are required.
4. Reload the extension and refresh its board tab after changes.
5. Run `node scripts/check.mjs` with Node.js 22 or newer.

Use a separate Chrome profile for development so experiments do not affect your personal tasks. Do not commit browser profiles, data exports, secrets, or generated packages.

## Manual verification

Check the behavior relevant to your change:

- Create and edit a task with and without a deadline time; move it between columns.
- Add subtasks and verify completion updates the parent task.
- Add a practice, check it off, and open Streaks to verify history and edit/delete controls.
- Book 11:25 AM for 1 hour 15 minutes; verify it ends at 12:40 PM.
- Reject an overlapping booking while allowing one that starts exactly when another ends.
- Edit, complete, and delete a booking, including one that crosses midnight.
- Refresh the tab and confirm saved data remains.
- Check current-hour ordering, a different schedule date, narrow windows, light/dark themes, and keyboard navigation.
- For background changes, inspect the service worker at `chrome://extensions` and check notifications with appropriate local test deadlines.

Automated repository checks validate syntax and file references; they do not replace browser interaction checks.

## Pull requests

Keep changes focused, explain the resulting behavior, and describe how you verified it. Avoid adding dependencies or permissions without explaining why they are needed. Contributions are provided under the project's [MIT license](LICENSE).
