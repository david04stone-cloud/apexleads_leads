/**
 * LeadForge — Backend Server v2
 * Clean rewrite with Supabase integrated + lead alerts
 */

import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));

// ── Supabase ──────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { global: { fetch: globalThis.fetch }, realtime: { transport: ws } }
);

// ── Alert Numbers ─────────────────────────────────────────
const ALERT_NUMBERS = [
  '+18032899119', // David
  '+17042540425', // Eli
];

// ── Slack Webhooks ────────────────────────────────────────
const SLACK_WEBHOOKS = {
  leads: process.env.SLACK_WEBHOOK,
  pipeline: process.env.SLACK_WEBHOOK_PIPELINE,
  ops: process.env.SLACK_WEBHOOK_OPS,
  weekly: process.env.SLACK_WEBHOOK_WEEKLY,
};

async function sendSlackTo(channel, blocks) {
  const url = SLACK_WEBHOOKS[channel];
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
  } catch (err) {
    console.error('Slack error ['+channel+']:', err.message);
  }
}

async function sendSlack(blocks) {
  await sendSlackTo('leads', blocks);
}

async function slackNewLead(name, service, client, score, priority, isUrgent, leadId) {
  const emoji = isUrgent ? '🚨' : priority === 'Hot' ? '🔥' : priority === 'Warm' ? '⚡' : '📋';
  const color = isUrgent ? '#ef4444' : priority === 'Hot' ? '#f59e0b' : '#10b981';
  await sendSlack([
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *New Lead — ${client.name}*
*Name:* ${name}
*Service:* ${service}
*Score:* ${score}/99 (${priority})
*AI Status:* Texting them now ⚡`
      }
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `Lead ID: ${leadId} · <https://leadforgedashboard.vercel.app|View Dashboard>` }]
    },
    { type: 'divider' }
  ]);
}

async function slackLeadBooked(name, service, clientName, leadId) {
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `✅ *BOOKED — ${clientName}*
*Name:* ${name}
*Service:* ${service}
*Status:* Appointment confirmed 🎉`
      }
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `Lead ID: ${leadId} · <https://apexleadsdashboard.vercel.app|View Dashboard>` }]
    },
    { type: 'divider' }
  ];
  await sendSlackTo('leads', blocks);
  await sendSlackTo('pipeline', blocks);
}

async function slackOpsAlert(message) {
  await sendSlackTo('ops', [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `⚠️ *OPS ALERT*
${message}` }
    },
    { type: 'divider' }
  ]);
}

async function slackPipelineUpdate(name, service, clientName, oldStatus, newStatus) {
  const emoji = newStatus === 'booked' ? '✅' : newStatus === 'closed' ? '🏆' : newStatus === 'contacted' ? '💬' : newStatus === 'lost' ? '❌' : '🔄';
  await sendSlackTo('pipeline', [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *Pipeline Update — ${clientName}*
*Lead:* ${name} — ${service}
*Status:* ${oldStatus} → *${newStatus}*`
      }
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `<https://apexleadsdashboard.vercel.app|View Dashboard>` }]
    },
    { type: 'divider' }
  ]);
}

// ── Clients ───────────────────────────────────────────────
const CLIENTS = {
  'apex-hvac': {
    id: 'apex-hvac',
    name: 'Apex HVAC Charlotte',
    niche: 'HVAC',
    area: 'Charlotte & Pineville NC',
    phone: '(704) 555-0190',
    cal: 'https://calendly.com/apexhvac/estimate',
    twilioNumber: process.env.TWILIO_DEFAULT_NUMBER,
    tone: 'friendly',
    aiNotes: 'Always mention same-day availability when possible. Family-owned business.',
    services: ['AC repair', 'AC installation', 'Heating', 'Emergency service', 'Tune-up'],
  },
  'green-edge': {
    id: 'green-edge',
    name: 'Green Edge Landscaping',
    niche: 'Landscaping',
    area: 'Lancaster SC',
    phone: '(803) 555-0142',
    cal: 'https://calendly.com/greenedge/estimate',
    twilioNumber: process.env.TWILIO_DEFAULT_NUMBER,
    tone: 'southern',
    aiNotes: 'Mention free estimates. Serve Lancaster County and surrounding areas.',
    services: ['Lawn mowing', 'Landscaping design', 'Mulch & edging', 'Sod installation'],
  },
};

// ── Tones ─────────────────────────────────────────────────
const TONE_PROMPTS = {
  friendly: 'Warm and conversational. Light emoji occasionally. Feels like a helpful neighbor.',
  professional: 'Polished and businesslike. No slang. Formal but approachable.',
  southern: "Warm Southern hospitality. Use y'all naturally. Genuine and community-focused.",
  urgent: 'Direct and action-focused. Short sentences. Creates light urgency around scheduling.',
  brief: 'Extremely concise. 1-2 sentences max. Gets straight to the point.',
  premium: 'Elevated and confident. Positions the business as the premium choice.',
};

// ── Conversation memory ───────────────────────────────────
const conversations = new Map();

// ── API clients ───────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ── Helpers ───────────────────────────────────────────────
function buildSystemPrompt(client, isUrgent) {
  const toneDesc = TONE_PROMPTS[client.tone] || TONE_PROMPTS.friendly;
  return `You are an AI follow-up assistant for ${client.name}, a local ${client.niche} company serving ${client.area}.
Your job is to convert incoming leads into booked appointments via text message.
Tone: ${toneDesc}
Business details:
- Services: ${client.services.join(', ')}
- Booking link: ${client.cal}
- Special instructions: ${client.aiNotes || 'None'}
Rules:
- Keep messages SHORT — this is SMS, not email. 2-4 sentences max.
- Never mention you are an AI.
- Always end your FIRST message by offering two specific day options.
- Once they confirm a day, suggest a time slot and give the booking link.
- After they confirm time, close with a warm confirmation.
${isUrgent ? 'IMPORTANT: This is an urgent lead. Prioritize same-day or next-day availability.' : ''}`;
}

function scoreLead(service, notes) {
  const text = `${service} ${notes}`.toLowerCase();
  const urgentKeywords = ['emergency', 'no ac', 'no heat', '3 day', '4 day', '5 day', 'elderly', 'baby', 'flood', 'leak', 'not working'];
  const hotKeywords = ['install', 'replace', 'new system', 'upgrade'];
  let score = 50;
  let isUrgent = false;
  urgentKeywords.forEach(k => { if (text.includes(k)) { score += 18; isUrgent = true; } });
  hotKeywords.forEach(k => { if (text.includes(k)) score += 12; });
  if (notes && notes.length > 30) score += 8;
  return { score: Math.min(score, 99), isUrgent, priority: isUrgent ? 'Rush' : score >= 70 ? 'Hot' : score >= 50 ? 'Warm' : 'Cold' };
}

async function sendSMS(to, from, body) {
  try {
    const message = await twilioClient.messages.create({ to, from, body });
    console.log(`SMS sent to ${to} — SID: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (err) {
    console.error('Twilio error:', err.message);
    return { success: false, error: err.message };
  }
}

async function generateAIResponse(systemPrompt, messages) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: systemPrompt,
    messages,
  });
  return response.content[0].text;
}

// ── Lead Alert Function ───────────────────────────────────
async function sendLeadAlert(name, service, client, score, priority, isUrgent) {
  const flag = isUrgent ? '🚨 URGENT' : priority === 'Hot' ? '🔥 HOT' : priority === 'Warm' ? '⚡ WARM' : '📋 NEW';
  const msg = `${flag} LEAD — LeadForge
👤 ${name}
🔧 ${service}
🏢 ${client.name}
📊 Score: ${score}/99
⚡ AI texting them now
——
Dashboard: leadforgedashboard.vercel.app`;

  const results = await Promise.all(
    ALERT_NUMBERS.map(number =>
      twilioClient.messages.create({
        to: number,
        from: process.env.TWILIO_DEFAULT_NUMBER,
        body: msg,
      }).catch(err => {
        console.error(`Alert failed to ${number}:`, err.message);
        return null;
      })
    )
  );
  console.log(`Lead alerts sent to ${ALERT_NUMBERS.length} numbers`);
}

// ── Routes ────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    status: 'LeadForge backend running',
    clients: Object.keys(CLIENTS).length,
    timestamp: new Date().toISOString()
  });
});

app.post('/lead/:clientId', async (req, res) => {
  const client = CLIENTS[req.params.clientId];
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const { name, phone, service, city, notes } = req.body;
  if (!name || !phone || !service) return res.status(400).json({ error: 'Name, phone, and service are required' });

  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;

  const { score, isUrgent, priority } = scoreLead(service, notes);
  const leadId = `lead_${Date.now()}`;

  console.log(`New lead: ${name} → ${client.name} | Score: ${score} | ${priority}${isUrgent ? ' ⚡ URGENT' : ''}`);

  // Save to Supabase
  const { error: dbError } = await supabase.from('leads').insert({
    id: leadId,
    client_id: client.id,
    name,
    phone: formattedPhone,
    service,
    city: city || client.area,
    notes: notes || '',
    score,
    priority,
    is_urgent: isUrgent,
    status: 'new',
  });
  if (dbError) {
    console.error('Supabase insert error:', dbError.message);
    slackOpsAlert(`Supabase insert failed for lead ${leadId}: ${dbError.message}`).catch(() => {});
  } else console.log('Lead saved to Supabase:', leadId);

  const systemPrompt = buildSystemPrompt(client, isUrgent);
  const userPrompt = `Write the first text message to this new lead.
Name: ${name}
Service needed: ${service}
Location: ${city || client.area}
Additional info: ${notes || 'none'}
Introduce the business briefly, acknowledge their request, and offer two specific day options this week.`;

  let aiMessage;
  try {
    aiMessage = await generateAIResponse(systemPrompt, [{ role: 'user', content: userPrompt }]);
  } catch (err) {
    console.error('Claude API error:', err.message);
    return res.status(500).json({ error: 'AI generation failed', detail: err.message });
  }

  conversations.set(formattedPhone, {
    clientId: client.id,
    leadId,
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }, { role: 'assistant', content: aiMessage }],
    status: 'contacted',
    lastActivity: new Date().toISOString(),
  });

  const smsResult = await sendSMS(formattedPhone, client.twilioNumber, aiMessage);

  // Update Supabase with AI message
  await supabase.from('leads').update({ ai_message: aiMessage, status: 'contacted' }).eq('id', leadId);

  // 🔔 Fire lead alerts to David + Eli
  sendLeadAlert(name, service, client, score, priority, isUrgent).catch(err =>
    console.error('Lead alert error:', err.message)
  );

  // 📣 Fire Slack notification to #leads
  slackNewLead(name, service, client, score, priority, isUrgent, leadId).catch(err =>
    console.error('Slack alert error:', err.message)
  );

  res.json({ success: true, leadId, score, priority, isUrgent, smsSent: smsResult.success });
});

app.post('/sms/reply', async (req, res) => {
  const { From, Body } = req.body;
  if (!From || !Body) return res.status(400).send('Missing fields');

  const convo = conversations.get(From);
  if (!convo) return res.status(200).send('OK');

  const client = CLIENTS[convo.clientId];
  if (!client) return res.status(500).send('Client config missing');

  const notInterested = ['stop', 'unsubscribe', 'no thanks', 'not interested', 'remove me'];
  if (notInterested.some(p => Body.toLowerCase().includes(p))) {
    conversations.delete(From);
    await sendSMS(From, client.twilioNumber, "No problem at all! We've removed you from our list. Have a great day!");
    return res.status(200).send('OK');
  }

  convo.messages.push({ role: 'user', content: Body });
  convo.lastActivity = new Date().toISOString();

  let aiReply;
  try {
    aiReply = await generateAIResponse(convo.systemPrompt, convo.messages);
  } catch (err) {
    aiReply = `Thanks for your message! You can book directly at ${client.cal}`;
  }

  convo.messages.push({ role: 'assistant', content: aiReply });

  const bookingConfirmed = ['booked', 'confirmed', 'see you', 'perfect', 'great', 'sounds good', 'that works'];
  if (bookingConfirmed.some(p => Body.toLowerCase().includes(p)) && convo.messages.length > 4) {
    convo.status = 'booked';
    await supabase.from('leads').update({ status: 'booked' }).eq('id', convo.leadId);
    console.log(`Lead BOOKED: ${convo.leadId}`);
    // 📣 Fire Slack booked notification
    slackLeadBooked(convo.messages[0]?.content?.split('Name: ')[1]?.split('\n')[0] || 'Unknown', convo.messages[0]?.content?.split('Service needed: ')[1]?.split('\n')[0] || 'Unknown', client.name, convo.leadId).catch(err => console.error('Slack booked error:', err.message));
  }

  await sendSMS(From, client.twilioNumber, aiReply);
  res.status(200).send('OK');
});

app.get('/dashboard/leads', async (req, res) => {
  if (req.query.secret !== process.env.DASHBOARD_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: data.length, leads: data });
});

app.get('/dashboard/clients', async (req, res) => {
  if (req.query.secret !== process.env.DASHBOARD_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const { data, error } = await supabase.from('clients').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ clients: data });
});

app.post('/slack/weekly-report', async (req, res) => {
  if (req.query.secret !== process.env.DASHBOARD_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  
  const { data: leads } = await supabase.from('leads').select('*');
  const { data: clients } = await supabase.from('clients').select('*');
  
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekLeads = leads?.filter(l => l.created_at > weekAgo) || [];
  const weekBooked = weekLeads.filter(l => l.status === 'booked' || l.status === 'closed');
  const totalMRR = clients?.reduce((s, c) => s + (c.mrr || 0), 0) || 0;
  const bookingRate = weekLeads.length ? Math.round(weekBooked.length / weekLeads.length * 100) : 0;

  await sendSlackTo('weekly', [
    {
      type: 'header',
      text: { type: 'plain_text', text: '📊 LeadForge — Weekly Report' }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Total MRR*
$${totalMRR.toLocaleString()}/mo` },
        { type: 'mrkdwn', text: `*Active Clients*
${clients?.length || 0}` },
        { type: 'mrkdwn', text: `*Leads This Week*
${weekLeads.length}` },
        { type: 'mrkdwn', text: `*Booked This Week*
${weekBooked.length} (${bookingRate}%)` },
      ]
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `<https://leadforgedashboard.vercel.app|→ View Full Dashboard>` }
    },
    { type: 'divider' }
  ]);

  res.json({ success: true, message: 'Weekly report posted to Slack' });
});

app.get('/dashboard/stats', async (req, res) => {
  if (req.query.secret !== process.env.DASHBOARD_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const { data: leads } = await supabase.from('leads').select('*');
  const { data: clients } = await supabase.from('clients').select('*');
  const booked = leads?.filter(l => l.status === 'booked').length || 0;
  const total = leads?.length || 0;
  res.json({
    totalLeads: total,
    booked,
    bookingRate: total > 0 ? Math.round((booked / total) * 100) : 0,
    totalClients: clients?.length || 0,
    mrr: clients?.reduce((a, c) => a + (c.mrr || 0), 0) || 0,
  });
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════╗
  ║  LeadForge backend running         ║
  ║  Port: ${PORT}                        ║
  ║  Clients loaded: ${Object.keys(CLIENTS).length}                 ║
  ╚════════════════════════════════════╝
  `);
});
