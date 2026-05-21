# ApexLeads — Operators Guide
## How to run this business day to day

---

## THE BIG PICTURE

You are running a done-for-you lead generation and appointment booking service
for local home service contractors. You handle everything — ads, landing pages,
AI follow-up, reporting. They just show up to the jobs.

Your value proposition in one sentence:
"We put booked appointments on your calendar automatically. You don't touch anything."

---

## YOUR PACKAGES & PRICING

### Starter — $500/mo
- Reviews-to-ads creative (their Google reviews become the ad)
- Landing page (branded to their business)
- AI SMS follow-up (instant, 24/7)
- Lead pipeline dashboard
- Client runs their own ads (you advise, they spend)
- Best for: skeptical clients, first-time test, businesses with strong reviews

### Growth — $800/mo + $300 client ad spend
- Everything in Starter
- Custom ad design using stock photos + your copywriting
- You manage their Meta ad account
- Weekly lead report
- Best for: your standard client, bread and butter

### Pro — $1,200/mo + $500 client ad spend
- Everything in Growth
- You show up on-site for 30 min and shoot real content (phone is fine)
- You edit and run the video/photo ads
- Monthly strategy call (20 min)
- Best for: contractors who want to dominate their area

### Elite — $1,500/mo + $500 client ad spend
- Everything in Pro
- 8 social media posts per month
- Google Business Profile update monthly
- Review response management (you reply to their Google reviews)
- Priority support (same-day responses)
- Best for: larger contractors, upsell target after 3 months of results

### Add-ons (sell these after proving value)
- UGC-style ad: +$150 one-time
- Extra landing page variant (A/B test): +$100/mo
- Second niche / second service area: +$300/mo
- Calendly setup (if they don't have one): +$75 one-time

---

## CONTENT STRATEGY (no client effort required)

### Option 1 — Reviews to ads (all plans)
Pull their best Google reviews. Design a clean graphic:
- Star rating at top
- Review text in large font
- Reviewer name and city at bottom
- Business name/logo
Tools: Canva (free). Takes 20 minutes per ad. Run 3-4 variations.

### Option 2 — Stock photos + copy (Growth+)
Go to pexels.com or unsplash.com — search their niche.
Write a direct headline: "AC Not Cooling? We're In Charlotte Today."
Subtext: "Free estimate. Same-day service. Licensed & insured."
CTA: "Get my free estimate →"
Tools: Canva. Takes 30 minutes per ad set.

### Option 3 — On-site shoot (Pro+)
Show up to their shop, job site, or just their truck.
Shoot 15-20 short clips (5-15 seconds each):
- Them working / tools being used
- The finished result
- A quick "Hi I'm [name] from [business]" intro clip
- Their truck / logo / sign
Edit in CapCut (free, phone app). Add captions. Done.
This content performs the best and takes 45 min total including editing.

### Option 4 — UGC-style (add-on)
You film yourself, not the client. Straight to camera:
"If you're in Charlotte and need HVAC work done, I want to tell you about
someone I found who's actually legit..."
This "third party recommendation" format converts extremely well on Meta.
Film it on your phone, one take, no editing needed.

---

## ONBOARDING A NEW CLIENT — EXACT STEPS

### Before you sign them
- Walk in the door or call with the demo on your phone
- Show the AI follow-up demo (the one from Claude)
- Show the pipeline view — "this is how you'll see your leads"
- Quote them a package, collect first month upfront

### Day of signing (collect all this)
Send them the onboarding form (built in Claude) or collect:
- Business name, owner name
- Phone number for SMS
- Service area and list of services
- Their Google Business Profile URL
- Their booking preference (Calendly or you set one up)
- Package selected
- Ad spend budget (separate from your fee — their card, not yours)

### Week 1 setup checklist
- [ ] Buy their Twilio number ($1/mo)
- [ ] Add their config to server.js, redeploy
- [ ] Build their landing page from template (15 min)
- [ ] Deploy landing page to Vercel
- [ ] Set up their Calendly if needed (free, 10 min)
- [ ] Create their Meta ad creative (reviews or stock)
- [ ] Set up their Meta ad campaign
  - Campaign objective: Leads
  - Audience: Homeowners, 25-65, 15mi radius of their area
  - Budget: Their ad spend / 30 for daily budget
  - Destination: Their landing page URL
- [ ] Do a test submission — confirm SMS fires within 60 seconds
- [ ] Send client a "you're live" message with their dashboard link

### Ad account setup notes
- Always run ads FROM the client's Facebook page (not yours)
- They give you admin access to their Facebook Business Manager
- Start with $10/day for first week to warm the account
- Scale up once you see leads converting
- Keep 2-3 ad variants running and kill the one with worst CTR after 7 days

---

## WEEKLY OPERATIONS (per client, ~30 min/week)

### Monday
- Check dashboard for new leads
- Review any leads that didn't book — check if AI dropped the ball
- Check Meta ad performance (CPL — cost per lead — target under $15)

### Wednesday
- Send weekly report to client (template below)
- Check Twilio for any delivery failures

### Friday
- Review the week's booked appointments vs leads
- If booking rate under 50% — review AI tone, check if landing page form is working
- If CPL over $20 — swap ad creative

### Weekly report template (send via text or email)
---
Hey [Owner name] — here's your weekly update from ApexLeads:

📥 New leads this week: [X]
📅 Appointments booked: [X]
📊 Booking rate: [X]%
💰 Est. job value generated: ~$[X]

[If good week]: Great week! The [service] leads are converting really well.
[If slow week]: Leads were slower this week — I'm tweaking the ad creative
to improve volume next week.

Any questions just reply here.
---

---

## CLIENT CONVERSATIONS — HOW TO HANDLE COMMON SITUATIONS

### "How come I only got 3 leads this week?"
Never be defensive. Own it and have a solution ready:
"Lead volume was lower this week — I've already adjusted the ad targeting
and swapped the creative. You should see more volume by Wednesday.
In the meantime the 3 leads you did get — did any of them turn into jobs?"

Redirect to value: jobs booked, not leads. A slow week with 2 high-value
jobs is better than a busy week with 10 tire-kickers.

### "I want to cancel"
First — find out why. Is it money? Results? Distrust?
- If money: offer to pause for 30 days, not cancel
- If results: pull up the numbers — how many jobs came through the system?
  Show them the math. One $5,000 HVAC install = 4-6 months of your fee.
- If distrust: get on a call, walk them through exactly what you did last month

### "Can you lower the price?"
Don't discount your retainer — it devalues everything.
Instead: "I can move you down to the Starter package at $500/mo.
You'd manage your own ad spend and we'd simplify the creative.
But honestly based on your results I think you'd be leaving money on the table."

### "Can I see what the AI is actually saying to my leads?"
Yes — add them to the pipeline dashboard view. Show them a real conversation.
This is usually a positive moment — they're impressed, not suspicious.

### When a client wants to cancel after one month
This almost always means they didn't see results fast enough.
Prevention: set expectations on day one.
"Typically it takes 2-3 weeks to dial in the ads and see consistent lead flow.
The first month is our setup and optimization month. Month 2 is where it gets good."

---

## COLD OUTREACH — HOW TO GET CLIENTS

### Who to target first
Start with contractors who have:
- A Facebook page with no recent posts
- No website or a website that looks like it was built in 2010
- 10+ Google reviews but no responses to any of them
- A truck with a phone number but no website URL on it

These are the ones who are working purely on word of mouth and are ready
for a system — they just don't know it yet.

### Best areas to start (your market)
- Lancaster SC — lower competition, older businesses, hungry for growth
- Pineville / South Charlotte — growing suburbs, lots of newer contractors
- Fort Mill / Tega Cay — high-income homeowners = bigger jobs
- Rock Hill — underserved, less competition than Charlotte proper

### Walk-in approach (works better than cold calls)
Show up in person. Dress clean — not a suit, just clean.
Walk in, ask for the owner. If they're not there, ask when they'll be in.
When you get them:

"Hey [name] — I run a service that books appointments for contractors like you
automatically. I'm not selling a course or a website. I literally put jobs on
your calendar and you pay me monthly. I can show you exactly how it works
on my phone in about 2 minutes — is now a good time?"

Then show the demo. The AI follow-up sequence is your closer.

### Follow-up if they say "not right now"
"No problem at all. Here's my card. I'll check back in a couple weeks —
I'm going to be working with someone in your area and I want to give you
first right of refusal."

This creates urgency without being pushy.

### Cold call script
"Hi, is this [owner name]? Hey [name], my name is [your name] — I work with
contractors in the [area] area helping them get more jobs booked automatically.
I'm not selling advertising — I actually handle the whole follow-up process
for you. I have 2 minutes — can I show you something on your phone real quick?"

If yes: send them your demo link.
If no: "I'll send you a quick video — takes 90 seconds. What's a good number to text?"

---

## FINANCIAL TRACKING

### Your numbers to watch monthly

| Metric | Target |
|--------|--------|
| MRR (monthly recurring revenue) | Grow by at least 1 client/mo |
| Client churn | 0 per month ideally, max 1 |
| Avg retainer per client | $800+ |
| Op cost per client | Under $40 |
| Your net margin | 90%+ |
| Hours per client per week | Under 1 hr |

### Income milestones
- 1 client: $500-1,500/mo — proof of concept
- 3 clients: $2,400-4,500/mo — part-time income replacement
- 5 clients: $4,000-7,500/mo — full-time income
- 10 clients: $8,000-15,000/mo — agency level
- 20 clients: $16,000-30,000/mo — hire a VA to help

### Expenses to track
- Railway backend hosting: ~$5/mo
- Twilio numbers + SMS: ~$25-35/mo per client
- Claude API: ~$3-5/mo per client
- Canva Pro (optional): $13/mo
- Your own Meta ad account (to test creative): optional
- Anthropic Claude subscription: $20/mo (for building)

---

## SCALING WITHOUT BURNING OUT

### Hire a VA at 5 clients
A virtual assistant can:
- Send weekly reports
- Monitor dashboards and flag issues
- Handle basic client texts and questions
- Source stock photo creative in Canva
Cost: $300-500/mo on Fiverr or Upwork. Worth it at 5 clients.

### At 10 clients, add a database
The memory-based lead storage resets on server restart. Once you have
real volume, add Supabase (free tier) to store leads permanently.
This also lets your VA pull reports without bothering you.

### Systemize everything with SOPs
For every repeated task, write a one-page SOP (standard operating procedure).
Onboarding a new client. Weekly reporting. Handling a complaint.
When you hire, you hand them the SOP. They don't need you.

---

## YOUR TECH STACK (full picture)

| Tool | Purpose | Cost |
|------|---------|------|
| Claude (this app) | Build and iterate on the system | $20/mo |
| Railway | Backend server hosting | ~$5/mo |
| Vercel | Landing page hosting | Free |
| Twilio | SMS sending/receiving | ~$1/mo + usage |
| Anthropic API | AI follow-up engine | ~$3-5/mo per client |
| Canva | Ad creative design | Free / $13/mo |
| Meta Ads Manager | Running ads for clients | Free (client pays ad spend) |
| Calendly | Appointment booking | Free tier works |
| GitHub | Code storage and deployment | Free |
| Google Drive | Client files, reports | Free |

Total monthly cost to run the entire operation: ~$50-100/mo fixed
Everything else scales with client count.

---

## THE PITCH IN ONE PAGE (print this and keep it with you)

**What you do:**
Done-for-you appointment booking for local contractors.

**What they get:**
- Branded landing page that captures leads 24/7
- Instant AI text follow-up (within 60 seconds of form submit)
- Automatic appointment booking on their calendar
- Weekly report showing leads, bookings, and estimated job value
- You handle content, ads, and the whole system

**What they don't have to do:**
Film videos. Learn software. Chase leads. Answer the phone at 10pm.

**What it costs:**
$500-1,500/mo depending on package + their ad spend (separate).

**What it's worth:**
One booked HVAC install = $4,000-12,000.
One booked roofing job = $10,000-20,000.
Your fee pays for itself with a single job per month.

**Your close:**
"Let me show you something on my phone. Takes 2 minutes."
→ Show the AI demo.
→ Show the pipeline.
→ Ask: "Would it help your business if this was running for you next week?"

---

Built with ApexLeads · Agency OS v1.0
