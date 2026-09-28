# BAW Attendance

A Next.js site for office attendance. Each person signs in on their own page with a PIN. The browser shares a location, and the server decides whether they are inside the office radius. Admins manage people and teams, and see who is in today.

People, teams, the office, and attendance are stored in Neon Postgres.

## Run

Create a free database at [neon.tech](https://neon.tech). Copy the connection string into `.env.local`:

```
DATABASE_URL=postgresql://...
SESSION_SECRET=a long random string
```

```powershell
npm install
npm run admin -- --name "Ada Shah" --email ada@example.com --password "a long password"
npm run dev
```

To set a new password for an admin who already exists:

```powershell
npm run admin -- --reset --email ada@example.com --password "a new long password"
```

That signs the admin out of every device.

Open http://localhost:3000

The front page lists the office. A person opens their name, signs in with the PIN an admin set, then checks in or out and logs off. Admin sign-in is at http://localhost:3000/login.

When there are no teams, team names stay off the desk, people list, and attendance screens. The Teams page is still there if an admin opens it to add one.

## Deploy on Vercel

Create a free Vercel project and import this repo. In the project settings, set `DATABASE_URL` to the same Neon connection string and set `SESSION_SECRET` to a long random string. Keep that secret. Changing it signs everyone out.

Run `npm run admin` once, from this computer, before anyone signs in. The same command adds another admin later. `--reset` changes an existing admin password.

Sign in at `/login`, then use **Use my location** and **Use this Wi-Fi** on the office card.

Neon’s free plan sleeps after a few quiet minutes. The first visit after that can take a moment.

## Demo away from the Bangalore office

Sign in as the admin and choose **Use my location**, then **Save office**. Mark attendance from that same place.
