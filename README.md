# ApexLeads — Deployment Guide
## From zero to live in one weekend

---

## What you need before starting
- A laptop (Mac or Windows both work)
- A free GitHub account → github.com
- A free Railway account → railway.app
- A free Vercel account → vercel.com
- A Twilio account → twilio.com (free trial gives you $15 credit)
- Your Anthropic API key → console.anthropic.com

---

## PART 1 — Set up your local machine (one time only)

### Step 1 — Install Node.js
Go to nodejs.org and download the LTS version. Install it.
To verify: open Terminal (Mac) or Command Prompt (Windows) and type:
```
node --version
```
You should see something like v20.x.x

### Step 2 — Install Git
Go to git-scm.com and download Git. Install it.

### Step 3 — Get the backend files
You have three files from your Claude session:
- server.js
- package.json
- .env.example

Create a folder on your Desktop called `apexleads-backend` and put all three files in it.

---

## PART 2 — Configure your environment

### Step 4 — Set up your .env file
In your `apexleads-backend` folder, make a copy of `.env.example` and rename it `.env`

Fill in each value:

**Anthropic API key:**
1. Go to console.anthropic.com
2. Click "API Keys" in the sidebar
3. Click "Create Key" — copy it immediately (you only see it once)
4. Paste it as: `ANTHROPIC_API_KEY=sk-ant-api03-...`

**Twilio credentials:**
1. Go to console.twilio.com and create an account
2. On the dashboard you'll see Account SID and Auth Token — copy both
3. Go to Phone Numbers → Buy a Number → search your area code → buy ($1/mo)
4. Copy the number in +1XXXXXXXXXX format as your TWILIO_DEFAULT_NUMBER

**Dashboard secret:**
Just make up a password. Something like `apexleads2026admin` — you'll use this
to access your lead data. Write it down somewhere safe.

### Step 5 — Test it locally
Open Terminal, navigate to your folder:
```
cd Desktop/apexleads-backend
npm install
npm run dev
```

You should see:
```
╔════════════════════════════════════╗
║  ApexLeads backend running         ║
║  Port: 3000                        ║
╚════════════════════════════════════╝
```

Open your browser and go to: http://localhost:3000
You should see: `{"status":"ApexLeads backend running"...}`

If you see that — the backend works. ✓

---

## PART 3 — Push to GitHub

### Step 6 — Create a .gitignore file
In your folder, create a file called `.gitignore` with this content:
```
node_modules
.env
```
This prevents your API keys from being uploaded to GitHub. Critical.

### Step 7 — Push to GitHub
```
git init
git add .
git commit -m "Initial ApexLeads backend"
```

Go to github.com → New Repository → name it `apexleads-backend` → Create
Copy the commands it shows you under "push an existing repository" and run them.

---

## PART 4 — Deploy to Railway (your live server)

### Step 8 — Deploy
1. Go to railway.app and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `apexleads-backend` repo
4. Railway will auto-detect Node.js and start building

### Step 9 — Add environment variables
In Railway, click your project → Variables tab → Add all the same variables
from your `.env` file one by one. Railway keeps these secure.

### Step 10 — Get your live URL
In Railway → Settings → Networking → click "Generate Domain"
You'll get a URL like: `apexleads-backend-production.up.railway.app`

Test it: visit that URL in your browser — you should see the status JSON. ✓

Write this URL down. This is your backend URL. You'll need it in two places:
1. Your landing page forms (where to POST lead data)
2. Twilio webhook (where to send incoming SMS replies)

---

## PART 5 — Wire up Twilio webhook

### Step 11 — Set the Twilio webhook
This tells Twilio where to send replies when a lead texts back.

1. Go to console.twilio.com → Phone Numbers → Manage → Active Numbers
2. Click your number
3. Under "Messaging" → "A message comes in" → set to Webhook
4. Enter: `https://YOUR-RAILWAY-URL.railway.app/sms/reply`
5. Method: HTTP POST
6. Save

Now when a lead texts back, Twilio sends it to your server, Claude responds,
and Twilio sends the reply. Fully automatic. ✓

---

## PART 6 — Connect your landing pages

### Step 12 — Update the form action
In each client's landing page HTML, find the form submit handler and update
the URL to point to your Railway backend:

```javascript
// Change this:
const response = await fetch('/lead/apex-hvac', { ... })

// To this:
const response = await fetch('https://YOUR-RAILWAY-URL.railway.app/lead/apex-hvac', { ... })
```

The client ID in the URL (`apex-hvac`) must match a key in the CLIENTS object
in server.js.

### Step 13 — Deploy landing pages to Vercel
Each landing page is a standalone HTML file. To deploy:

1. Create a folder for each client: `apex-hvac-landing`
2. Put their `index.html` inside
3. Go to vercel.com → New Project → drag the folder in
4. Vercel gives you a free URL like: `apex-hvac-landing.vercel.app`

That's the URL you put in your Meta ads. ✓

---

## PART 7 — Adding a new client (15 minutes)

When you sign a new client, here's the exact process:

1. **Add their config to server.js** — copy an existing client block in the
   CLIENTS object and fill in their details. Redeploy on Railway (automatic
   if you push to GitHub).

2. **Set up their Twilio number** — buy a new number in Twilio ($1/mo),
   add it to your .env as `TWILIO_NUMBER_CLIENTID`, redeploy.

3. **Create their landing page** — open the master landing page template,
   swap in their business name, headline, services, and color. Takes 10 min.

4. **Deploy their landing page** — drag to Vercel, get their URL.

5. **Run a test** — submit the form yourself, confirm you receive an SMS
   within 60 seconds. If you do, you're live. ✓

6. **Set up their Meta ad** — use their landing page URL as the destination.

Total time per new client: 15-30 minutes. ✓

---

## Monthly operating costs per client

| Item | Cost |
|------|------|
| Railway backend | ~$5/mo (shared across all clients) |
| Twilio phone number | $1/mo per client |
| Twilio SMS | ~$15-25/mo per client (usage based) |
| Claude API calls | ~$3-5/mo per client |
| Vercel landing page hosting | Free |
| **Total per client** | **~$25-35/mo** |

You charge $500-1,500/mo. Your margin is 95%+.

---

## Troubleshooting

**SMS not sending:**
- Check Twilio account balance (free trial has limits)
- Verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Railway variables
- Check Railway logs for error messages

**"Client not found" error:**
- The client ID in your form URL must exactly match the key in CLIENTS object
- IDs are case-sensitive: `apex-hvac` not `Apex-HVAC`

**Twilio webhook not firing:**
- Make sure your Railway URL is correct in Twilio console
- Must be HTTPS (Railway gives you this automatically)
- Method must be POST not GET

**Claude API errors:**
- Check your API key is correct and has credits
- Railway logs will show the exact error message

**Leads not showing in dashboard:**
- Conversations are stored in memory — they reset when server restarts
- For permanent storage, the next upgrade is adding a database (Supabase, free tier)

---

## Next upgrade: adding a database

Right now leads are stored in memory (they disappear if the server restarts).
For a permanent solution, add Supabase (free tier):

1. Go to supabase.com → new project
2. Create a `leads` table with columns: id, clientId, name, phone, service,
   city, score, status, createdAt
3. Install: `npm install @supabase/supabase-js`
4. Replace the `conversations` Map with Supabase inserts/queries

This is the next natural step once you have 3+ paying clients.

---

## You're live. Here's your pitch.

When you walk into a contractor's office, you can now say:

*"I run a done-for-you lead system. I create the ads, build the landing page,
and the moment someone fills out a form, they get a personalized text back
within 60 seconds — automatically. The AI follows up, qualifies them, and
books the appointment on your calendar. You don't touch anything. You just
show up to the jobs."*

Then pull out your phone and show them the demo. Close.

---

Built with ApexLeads · Your agency OS
