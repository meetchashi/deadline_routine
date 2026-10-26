<div align="center">

<img src="icons/icon128.png" alt="Deadline Board icon" width="80" height="80">

# Deadline Board

### Your deadlines, habits, and daily plan — in one Chrome tab.

Organize tasks on a board, build daily practice streaks, and reserve time for focused work.

**🧩 Chrome extension · 🔒 Saved locally · ⚡ No account or setup tools needed**

[Install in Chrome](#install-in-chrome) · [Create your first task](#create-your-first-task) · [Plan your day](#plan-your-day) · [Track habits](#track-habits)

</div>

---

| 📋 Organize your work | 🕒 Make time for it | 🔥 Build consistency |
| --- | --- | --- |
| Move tasks from **Pending** to **In progress** to **Completed**. Keep future ideas in **Icebox**. | Book an exact start time and duration in your daily schedule. | Check off daily practices and follow your progress with streaks. |

<a id="install-in-chrome"></a>
## 🧩 Install in Chrome

**You need:** desktop Google Chrome and a downloaded copy of this project. No terminal commands or package installation are required.

### 1. Download and unzip

At the top of this GitHub repository, click **Code → Download ZIP**. Extract the ZIP and move the extracted folder somewhere permanent, such as your Documents folder.

> [!TIP]
> Open the extracted folder and look for **`manifest.json`**. This is the folder you will select in Chrome. Select the folder itself, rather than the ZIP or an individual file.

### 2. Open Chrome's extensions page

Copy this address, paste it into Chrome's address bar, and press **Enter**:

```text
chrome://extensions
```

### 3. Enable Developer mode

Turn on **Developer mode** in the upper-right corner of the extensions page.

### 4. Load the extension

Click **Load unpacked**, select the extracted folder containing `manifest.json`, and confirm your selection.

**You should now see a Deadline Board card on the extensions page.** The board also opens in a new tab on first installation.

### 5. Pin it for everyday use

Click Chrome's **Extensions** button—the puzzle-piece icon in the toolbar—then click the **pin** beside **Deadline Board**.

Click the Deadline Board toolbar icon whenever you want to open your board. If its board tab is already open, the icon brings you back to it.

> [!NOTE]
> This installation uses **Load unpacked**. A Chrome Web Store account is not needed. Keep the project folder in place so Chrome can continue loading its files.

<a id="create-your-first-task"></a>
## 📋 Create your first task

Your first board includes example tasks. Click **Remove samples** if you want to start with an empty board.

### 1. Click **Add task**

Use the button at the top-right of the board.

### 2. Fill in the task

For example:

| Field | Example | Required? |
| --- | --- | --- |
| **Task** | Prepare client proposal | Yes |
| **Deadline date** | Choose tomorrow's date | Yes |
| **Time** | 5:00 PM | Optional |
| **Column** | Pending | Starts as Pending; you can choose another column |
| **Subtasks** | Gather requirements<br>Draft proposal<br>Review and send | Optional; enter one per line |

Use **Today**, **Tomorrow**, **In 3 days**, or **In a week** to set a date quickly. Without a time, the deadline is treated as the end of the selected day.

### 3. Save it

Click **Add task** at the bottom of the form. Your card appears in the column you chose and is saved automatically in this Chrome profile.

### 4. Move it as you work

**Pending → In progress → Completed**

Drag the card into another column, or use its arrow buttons.

| Column | Put these tasks here |
| --- | --- |
| **Pending** | Work you plan to start. |
| **In progress** | Work you are doing now. |
| **Completed** | Work you have finished. |
| **Icebox** | Ideas or tasks you want to revisit later. |

### Everyday task controls

| What you want to do | How to do it |
| --- | --- |
| **Edit a task** | Click the pencil icon on its card. |
| **Work through subtasks** | Expand the subtask section and update each subtask's status. |
| **Finish a task** | Move it to Completed. Its subtasks are also marked completed. |
| **Save something for later** | Click the snowflake icon to move it to Icebox. |
| **Delete a task** | Click the trash icon, then click it again to confirm. |

> [!TIP]
> **Look for the red edge.** An **EMERGENCY** tag means a task is overdue or due within three days. The red number on the toolbar icon counts urgent tasks and practices in emergency. Example tasks do not trigger notifications or contribute to that number.

<a id="plan-your-day"></a>
## 🕒 Plan your day

Use **Daily routine** in the left column to reserve time for a task or event.

1. Click **+ Add** or click an hour in the timeline.
2. Enter a name, date, and exact **start time**.
3. Set the duration in **hours** and **minutes**.
4. Click **Save booking**. The timeline blocks the full duration.

> **Example:** “Work on proposal” starting at **11:25 AM** for **1 hour 15 minutes** reserves **11:25 AM–12:40 PM**.

| Schedule behavior | What to expect |
| --- | --- |
| **Today** | The current hour stays first, followed by the remaining hours through 23:00. |
| **Another date** | Choose a schedule date to see its full 24-hour timeline. Click **Today** to return. |
| **Overlapping times** | A new booking is rejected if it overlaps an existing one. |
| **Across midnight** | A booking continues into the next date. |
| **Changes** | Click a booking to edit it, mark it completed, or delete it. Click Delete twice to confirm. |

The schedule refreshes every minute and when you return to the tab. Past hours are hidden for today; an ongoing booking stays visible for its remaining time. Completed bookings still reserve their time.

> [!NOTE]
> **Board tasks and schedule bookings are separate.** Adding a task to the board does not automatically book time. Schedule bookings do not send reminder notifications.

<a id="track-habits"></a>
## 🔥 Track habits with daily practices

1. Click **+ Add practice** beside the Practices heading.
2. Enter a habit, such as **Read 20 pages**, and choose a start date. Set an end date if you want one.
3. Click the practice each day to mark it done. Click again to undo today's check.
4. Click **Streaks** beside **Practices** to see your current streak, best streak, total completed days, and the last 14 days. Edit and delete controls are there too.

| Missed days in a row | Status |
| --- | --- |
| **3 days** | 🟠 Alert |
| **7 days** | 🔴 Emergency |

Today counts as missed only after the day is over. Practices return unchecked the next day within their scheduled date range.

## 🔔 Get deadline reminders

| Reminder | Default timing |
| --- | --- |
| **Urgent-task digest** | Daily, starting at **9:00 AM local time**. |
| **Timed task deadline** | Within **60 minutes before** the deadline. |
| **Practice alert or emergency** | Once daily after the digest hour. |

Chrome must be running, notifications must be allowed, and your computer must be awake for reminders to appear on time. Delivery is not guaranteed at an exact time. Email and SMS reminders are not included.

<details>
<summary><strong>Customize reminder times and practice thresholds</strong></summary>

Edit these values in [logic.js](logic.js), then reload the extension:

| Setting | Purpose |
| --- | --- |
| `DIGEST_HOUR` | Local hour for the morning digest. |
| `LEAD_MINUTES` | How far ahead of a timed deadline to remind you. |
| `PRACTICE_ALERT_DAYS` | Missed days before a practice alert. |
| `PRACTICE_EMERGENCY_DAYS` | Missed days before a practice emergency. |

</details>

## 💬 Help and common questions

<details>
<summary><strong>Chrome says the manifest is missing. Which folder should I choose?</strong></summary>

Extract the downloaded ZIP first. In **Load unpacked**, select the folder that directly contains `manifest.json`, `board.html`, and `background.js`. If the extracted download has another folder inside it, open that inner folder and check for these files.

</details>

<details>
<summary><strong>How do I update the extension?</strong></summary>

Replace the source files in the installed project folder, open `chrome://extensions`, click the reload button on the Deadline Board card, and refresh the board tab.

Avoid uninstalling the extension to update it, because uninstalling can remove its saved data.

</details>

<details>
<summary><strong>Where are my tasks saved? Will they sync to my phone?</strong></summary>

Tasks, practices, and bookings stay in the current Chrome profile. They do not sync between devices, and there is no built-in export or restore feature. Desktop Chrome is required for installation; Chrome on phones does not run this extension.

</details>

<details>
<summary><strong>Why am I not receiving notifications?</strong></summary>

Check that Chrome is running and that both Chrome and your operating system allow notifications. Your computer must be awake. Board tasks need a deadline time for the advance reminder; daily schedule bookings do not send reminders, and sample tasks never notify you.

</details>

## 🔒 Privacy

Your tasks, practices, and bookings are saved locally with `chrome.storage.local`. The extension includes no analytics or advertising and does not send your data to a server. Notification previews may show task or practice titles.

| Permission | Why it is needed |
| --- | --- |
| `storage` | Save your tasks, subtasks, practices, bookings, and reminder history. |
| `alarms` | Check for reminders and update the toolbar badge. |
| `notifications` | Display deadline and practice reminders. |

No host permissions are requested. Read [PRIVACY.md](PRIVACY.md) for storage details and data removal.

## 🛠️ For developers

Built with plain HTML, CSS, and JavaScript, with no build step or runtime dependencies.

<details>
<summary><strong>Local development and checks</strong></summary>

Edit the source files directly, reload the extension at `chrome://extensions`, and refresh the board tab.

For UI-only previews, open `board.html` in a browser. This uses separate `localStorage` data and does not run Chrome notifications or the background worker.

Run repository checks with **Node.js 22 or newer**:

```sh
node scripts/check.mjs
```

These checks validate JavaScript syntax, the manifest, and referenced local assets. GitHub Actions runs the same checks on pushes and pull requests. Browser behavior should also be checked manually; see [CONTRIBUTING.md](CONTRIBUTING.md).

</details>

<details>
<summary><strong>Project structure</strong></summary>

| File | Responsibility |
| --- | --- |
| `board.html` | Board layout and forms. |
| `board.css` | Themes, responsive layout, and timeline styling. |
| `board.js` | Board interactions, persistence, practices, and bookings. |
| `logic.js` | Shared dates, urgency, practice statistics, reminders, and booking rules. |
| `background.js` | Extension tab handling, alarms, notifications, and toolbar badge. |
| `manifest.json` | Chrome extension metadata and permissions. |
| `icons/` | Extension icons. |

</details>

<details>
<summary><strong>Publish the source on GitHub</strong></summary>

Create an empty repository on GitHub, commit this project, add the repository as the `origin` remote, and push the `main` branch. Do not initialize the remote with a second README or license.

Publishing the source does not publish the extension to the Chrome Web Store. Users can install it using the **Load unpacked** instructions above.

</details>

---

**Contribute:** Bug reports, suggestions, and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md), and keep personal task data out of reports and commits.

**License:** [MIT](LICENSE) © 2026 Deadline Board contributors. Commercial use is permitted; no royalty or payment to the author is required.
