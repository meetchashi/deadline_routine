# Deadline Board

A local-first Chrome extension for deadlines, daily practices, and time blocking. Keep tasks on a four-column board, track habit streaks, and plan your day with bookings that span their exact duration.

Built with plain HTML, CSS, and JavaScript. No account, server, build step, or runtime dependencies.

## Features

- **Task board:** Pending, In progress, Completed, and Icebox, with drag and drop, subtasks, and required deadlines.
- **Urgency indicators:** Highlight overdue tasks and deadlines within three days; show an urgent-item count on the extension icon.
- **Daily practices:** Check off repeating habits and view current streaks, personal bests, totals, and a 14-day history from the **Streaks** button beside **Practices**.
- **Time blocking:** Book tasks or events with an exact start time and duration. For example, **11:25 AM + 1 hour 15 minutes blocks through 12:40 PM**.
- **Current-hour schedule:** Today starts at the current hour and runs through 23:00. Other dates show the full day. Bookings can cross midnight; overlapping bookings are rejected.
- **Booking controls:** Edit bookings, mark them completed, or delete them.
- **Chrome notifications:** Get deadline reminders and alerts for missed practices.
- **Adaptive layout:** Light and dark themes follow your system, with a responsive board layout.

## Install locally

1. Download this repository using **Code → Download ZIP** and extract it, or clone it.
2. Keep the folder somewhere permanent.
3. Open `chrome://extensions` in desktop Chrome.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the folder containing `manifest.json`.
6. Pin **Deadline Board** from Chrome's Extensions menu, then click its icon.

No package installation or compilation is needed. To update a local installation, replace the source files, reload the extension at `chrome://extensions`, and refresh the board tab. Avoid removing the extension when updating, because uninstalling can remove its saved data.

## Use the board

### Tasks

Click **Add task**, enter a title and deadline date, and optionally set a time and subtasks. A deadline without a time is treated as the end of that day.

Move cards with drag and drop or their arrow buttons. The snowflake moves a task to Icebox. Cards also have edit, subtask, and delete controls; click the trash button twice to confirm deletion. Completing a task marks all its subtasks completed.

The initial board contains demonstration tasks. Use **Remove samples** to clear them. Samples never trigger reminders or contribute to the toolbar badge.

### Practices and streaks

Click **+ Add practice**, choose a start date and an optional end date, then check off the practice each day. Click it again to undo today's completion.

Click **Streaks** beside **Practices** to see the history and edit or delete practices. Missing three consecutive days triggers an alert; missing seven triggers an emergency. Today is not counted as missed until the day is over.

### Daily routine

Click **+ Add** in the left column or click an hour in the timeline. Enter a task or event, date, start time, and duration between one minute and 24 hours.

Click a booking to edit it, mark it completed, or delete it. Click **Delete** twice to confirm. Completed bookings still reserve their time. Choose another date to plan or review a full day, and click **Today** to return to the current hour.

The schedule refreshes every minute and when you return to the tab. Past hours are hidden for today, while an ongoing booking remains visible for its remaining time. Schedule bookings are separate from deadline-board tasks and do not send notifications.

### Reminders

- A daily digest of urgent tasks starts at **9:00 AM local time**.
- Timed deadlines get a reminder within **60 minutes** before they are due.
- Practices in alert or emergency receive a daily notification after the digest hour.

Chrome must be running, notifications must be allowed, and the computer must be awake for reminders to appear on time. These reminders are not an exact-time delivery guarantee. There are no email or SMS reminders.

To customize reminder timing, edit `DIGEST_HOUR` and `LEAD_MINUTES` in [logic.js](logic.js). Practice thresholds are `PRACTICE_ALERT_DAYS` and `PRACTICE_EMERGENCY_DAYS` in the same file. Reload the extension after changes.

## Privacy and permissions

Data stays in the current Chrome profile using `chrome.storage.local`. The extension does not transmit your tasks, practices, or bookings to a server and includes no analytics or advertising. It does not sync between devices. See [PRIVACY.md](PRIVACY.md) for storage details and data removal.

| Permission | Purpose |
| --- | --- |
| `storage` | Save tasks, subtasks, practices, bookings, and reminder history locally. |
| `alarms` | Periodically check for reminders and update the toolbar badge. |
| `notifications` | Display deadline and practice reminders. |

No host permissions are requested. The layout supports narrow windows, but installation is intended for desktop Chrome; Chrome on phones does not run this extension.

## Development

Edit the source files directly, reload the extension, and refresh the board tab. For UI-only previews, open `board.html` in a browser; this uses separate `localStorage` data and does not run Chrome notifications or the background worker.

Run the repository checks with Node.js 22 or newer:

```sh
node scripts/check.mjs
```

The checks validate JavaScript syntax, the manifest, and referenced local assets. GitHub Actions runs the same checks on pushes and pull requests. Browser behavior should also be checked manually; see [CONTRIBUTING.md](CONTRIBUTING.md).

| File | Responsibility |
| --- | --- |
| `board.html` | Board layout and forms. |
| `board.css` | Themes, responsive layout, and timeline styling. |
| `board.js` | Board interactions, persistence, practices, and bookings. |
| `logic.js` | Shared dates, urgency, practice statistics, reminders, and booking rules. |
| `background.js` | Extension tab handling, alarms, notifications, and toolbar badge. |
| `manifest.json` | Chrome extension metadata and permissions. |
| `icons/` | Extension icons. |

## Publishing the repository

This project can be hosted as a public source repository without deploying a website or backend. After creating an empty repository on GitHub, commit the project and add that repository as the `origin` remote, then push the `main` branch. Do not initialize the remote with a second README or license.

Publishing the source on GitHub does not publish the extension to the Chrome Web Store. Users can install it using **Load unpacked** as described above.

## Contributing

Bug reports, suggestions, and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development and verification guidance. Keep personal task data and browser profiles out of reports and commits.

## License

[MIT](LICENSE) © 2026 Deadline Board contributors. Commercial use is permitted under the MIT license; no royalty or payment to the author is required.
