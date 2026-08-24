# Test Clients

HTML test clients for manual testing of endpoints.

## Available Test Clients

### beancount-stream.html

Test client for the `/beancount-stream` SSE (Server-Sent Events) endpoint.

**Features:**
- Real-time progress visualization with progress bar
- Event log showing all SSE events
- Example buttons for ASK mode (questions) and AGENT mode (tasks)
- Custom task input field
- Live connection status indicator

**Usage:**
1. Start the development server: `npm run dev`
2. Open `beancount-stream.html` in your browser
3. Configure your repository URL and GitHub token
4. Click "📊 Question Example" for ASK mode or "🔧 Task Example" for AGENT mode
5. Watch the progress bar and event log for real-time updates

**Modes:**
- **ASK mode**: Read-only question answering (no commits, no PR)
- **AGENT mode**: Full task execution (creates commits and PR)
