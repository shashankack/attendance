# BAW Attendance

A Next.js site for office attendance. Employees check in with the browser’s location. The server decides whether they are inside the office radius. Admins see who is in today and can move the office pin.

## Run

```powershell
npm install
npm run dev
```

Open http://localhost:3000

| Desk | Email | Password |
| --- | --- | --- |
| Employee | arun@baw.dev | password |
| Admin | admin@baw.dev | password |

The first run creates `data/db.json`. That file stays on this machine.

## Demo away from the Bangalore office

Sign in as the admin and choose **Use my location**, then **Save office**. Check in as Arun from that same place.
