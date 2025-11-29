# TaskFlow Pro - Advanced Productivity & Task Management App

A fully-functional web-based productivity and task management application with Google Calendar integration, smart notifications, and PWA support.

## 🎯 Features

### Task Management
- ✅ Create, edit, delete, and organize tasks
- 🎨 Priority levels (Low, Medium, High)
- 📁 Categories (Work, Personal, Urgent, Health, Learning)
- 📊 Task statuses (Upcoming, In Progress, Completed, Overdue)
- 🖱️ Drag-and-drop task reordering
- 📦 Archive completed tasks

### 📅 Google Calendar Integration
- 🔄 Automatic two-way sync with Google Calendar
- 📆 Tasks automatically create calendar events
- ✏️ Update calendar events when tasks change
- ❌ Delete events when tasks are completed

### 🔔 Smart Notifications
- **📧 Email Notifications**: Gmail integration for task reminders
- **💬 WhatsApp Notifications**: Twilio integration for instant alerts
- **🌅 Daily Summary**: Morning email with today's tasks
- **⚠️ Overdue Alerts**: Automatic notifications for overdue tasks

### 📊 Productivity Analytics
- 📈 Visual charts showing task completion rates
- 📉 Statistics by priority, category, and status
- 📅 Weekly productivity tracking

### 🎨 User Experience
- **🎯 Focus Mode**: Distraction-free single-task view with timer
- **🌓 Dark/Light Mode**: Theme toggle for comfortable viewing
- **📦 Archive**: Keep completed tasks organized
- **📥 CSV Export**: Download your tasks for backup
- **📱 Responsive Design**: Works perfectly on mobile and desktop

### 📱 PWA Support
- 📲 Installable on mobile and desktop
- 📴 Offline mode for viewing tasks
- 🔄 Automatic sync when connection restored
- ⚡ App shortcuts for quick access

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **UI**: Tailwind CSS, Shadcn/UI components
- **Authentication**: Better Auth with Google OAuth
- **Database**: Turso (SQLite)
- **APIs**: Google Calendar API, Gmail API, Twilio
- **PWA**: Service Worker with offline caching
- **Drag & Drop**: @dnd-kit
- **Charts**: Recharts
- **Date Handling**: date-fns

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install
# or
bun install
```

### 2. Environment Variables

The following environment variables are needed:

**Required for Google OAuth & Calendar/Gmail Integration:**
- `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret

**Optional for WhatsApp Notifications:**
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- `TWILIO_PHONE_NUMBER` - Your Twilio WhatsApp number

**Required for Cron Jobs (Production):**
- `CRON_SECRET` - Random secret string for cron job authentication

**Already Configured:**
- `TURSO_CONNECTION_URL` - Database URL
- `TURSO_AUTH_TOKEN` - Database auth token
- `BETTER_AUTH_SECRET` - Auth encryption secret

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Calendar API** and **Gmail API**
4. Go to "APIs & Services" > "Credentials"
5. Click "Create Credentials" > "OAuth 2.0 Client ID"
6. Configure OAuth consent screen if needed
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
8. Copy Client ID and Client Secret

### 4. Twilio Setup (Optional for WhatsApp)

1. Create account at [Twilio](https://www.twilio.com/)
2. Get a WhatsApp-enabled phone number (Sandbox or Production)
3. Copy Account SID, Auth Token, and Phone Number

### 5. Run Development Server

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel

```bash
vercel deploy
```

Set environment variables in Vercel dashboard. The `vercel.json` file is configured with cron jobs.

## 📋 API Endpoints

### Tasks
- `GET /api/tasks` - List all tasks (with filters)
- `POST /api/tasks` - Create new task
- `PUT /api/tasks?id={id}` - Update task
- `DELETE /api/tasks?id={id}` - Delete task
- `PATCH /api/tasks/{id}/status` - Update task status
- `GET /api/tasks/stats` - Get productivity statistics

### Calendar Integration
- `POST /api/calendar/sync` - Sync task with Google Calendar
  - Body: `{ taskId: number, action: 'create' | 'update' | 'delete' }`

### Notifications
- `POST /api/notifications/email` - Send email notification
- `POST /api/notifications/whatsapp` - Send WhatsApp notification

### Cron Jobs (Authenticated with Bearer token)
- `GET /api/cron/check-overdue` - Check and notify overdue tasks (runs every minute)
- `GET /api/cron/daily-summary` - Send daily task summary (runs daily at 8 AM)

## 💡 Usage Guide

### Sign In
1. Click "Sign in with Google" on homepage
2. Grant permissions for Calendar and Gmail access
3. Redirected to dashboard

### Create Task
1. Click "Add Task" button
2. Fill in title, description, priority, category, dates
3. Task automatically syncs to Google Calendar (if enabled)

### Focus Mode
1. Click "Focus Mode" in header
2. Work on one task at a time with timer
3. Mark complete or skip to next task

### Configure Notifications
1. Go to Settings
2. Enable email/WhatsApp notifications
3. Set reminder timing (minutes before due)
4. Add WhatsApp number if using WhatsApp alerts

### Export Tasks
1. Click "Export CSV" in dashboard
2. Download tasks.csv file
3. Open in Excel or Google Sheets

## 📱 PWA Installation

### Desktop
1. Click install icon in browser address bar
2. Or use browser menu: "Install TaskFlow Pro"

### Mobile
1. Open in mobile browser
2. Tap share button
3. Select "Add to Home Screen"

## ⚙️ Cron Jobs Configuration

The app uses Vercel Cron Jobs (configured in `vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/cron/check-overdue",
      "schedule": "* * * * *"  // Every minute
    },
    {
      "path": "/api/cron/daily-summary",
      "schedule": "0 8 * * *"  // Daily at 8 AM UTC
    }
  ]
}
```

Cron endpoints are protected with Bearer token authentication using `CRON_SECRET`.

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # Better Auth endpoints
│   │   ├── calendar/      # Google Calendar sync
│   │   ├── cron/          # Scheduled jobs
│   │   ├── notifications/ # Email & WhatsApp
│   │   └── tasks/         # CRUD operations
│   ├── dashboard/         # Main dashboard
│   ├── focus/            # Focus mode page
│   ├── settings/         # Settings page
│   ├── archive/          # Archive page
│   └── page.tsx          # Landing page
├── components/
│   ├── ui/               # Shadcn components
│   ├── TaskCard.tsx
│   ├── AddTaskDialog.tsx
│   ├── EditTaskDialog.tsx
│   └── ProductivityChart.tsx
├── db/
│   ├── index.ts          # Database client
│   └── schema.ts         # Drizzle schema
└── lib/
    ├── auth.ts           # Auth config
    └── auth-client.ts    # Client auth hooks
```

## 🔐 Security

- OAuth 2.0 for Google authentication
- Bearer token authentication for APIs
- Cron endpoints protected with secret
- Server-side session validation
- HTTPS required in production

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js, Better Auth, and Google APIs
