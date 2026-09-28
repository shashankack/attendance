# BAW Attendance

A Next.js site for office attendance. People tap their name on the desk and the browser shares a location. The server decides whether they are inside the office radius. Admins manage people and teams, and see who is in today.

## Run

```powershell
npm install
npm run dev
```

Open http://localhost:3000

The front page is the attendance desk. No employee password. Admin sign-in is at http://localhost:3000/login — `admin@baw.dev` / `password`.

The first run creates `data/db.json`. That file stays on this machine.

## Demo away from the Bangalore office

Sign in as the admin and choose **Use my location**, then **Save office**. Mark attendance from that same place.
