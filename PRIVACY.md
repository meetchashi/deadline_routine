# Privacy

Deadline Board stores your data locally and does not send it to an external service. The source includes no analytics, advertising, remote fonts, or external JavaScript dependencies.

## Stored information

In the installed extension, `chrome.storage.local` holds:

- `tasks`: task titles, deadlines, column status, subtasks, and sample-task markers.
- `routines`: practice titles, date ranges, and completion dates.
- `bookings`: scheduled titles, dates, start times, durations, and completion status.
- `sent`: reminder identifiers and timestamps used to avoid duplicate notifications.

The information stays in the current Chrome profile. Chrome profile backups or device backups may contain it. Local storage is not a substitute for a backup, and the extension has no built-in export or restore feature.

Opening `board.html` outside the extension uses browser `localStorage` instead. This preview data is separate from the installed extension's data.

## Notifications

Notifications can include task or practice titles. Their visibility, including on the lock screen, depends on your operating system and Chrome settings.

## Data removal

Delete individual entries using their controls. To remove all extension data, uninstall Deadline Board through `chrome://extensions`. Preview data can be removed through the browser's developer tools under local storage.

## Repository contributions

Saved user data is not part of the source repository. If you report an issue, remove personal information from screenshots and logs before sharing them publicly.
