/**
 * ApexLeads — Backend Server
 * ─────────────────────────────────────────────────────────────
 * Handles:
 *  1. Lead form submissions from landing pages
 *  2. AI follow-up generation via Claude API
 *  3. SMS sending via Twilio
 *  4. Incoming SMS replies → Claude → reply back
 *  5. Webhook to update lead status in your dashboard
 *
 * Deploy on Railway or Render (both free to start)
 * Setup instructions in README.md
 * ─────────────────────────────────────────────────────────────
 */

import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // needed for Twilio webhooks
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}));

// ─────────────────────────────────────────────────────────────
// CLIENTS — your master config (matches the dashboard)
// When you add a new client in the dashboard, add them here too
// In production this would be a database — for now it's a file
// ─────────────────────────────────────────────────────────────
const CLIENTS = {
  'apex-hvac': {
    id: 'apex-hvac',
    name: 'Apex HVAC Charlotte',
    niche: 'HVAC',
    area: 'Charlotte & Pineville NC',
    calLink: 'https://calendly.com/apexhvac/estimate',
    twilioNumber: process.env.TWILIO_NUMBER_APEX || process.env.TWILIO_DEFAULT_NUMBER,
    tone: 'friendly',
    aiNotes: 'Always mention same-day availability when possible. Family-owned business.',
    services: ['AC repair', 'AC installation', 'Heating', 'Emergency service', 'Tune-up'],
  },
  'green-edge': {
    id: 'green-edge',
    name: 'Green Edge Landscaping',
    niche: 'Landscaping',
    area: 'Lancaster SC',
    calLink: 'https://calendly.com/greenedge/estimate',
    twilioNumber: process.env.TWILIO_NUMBER_GREEN || process.env.TWILIO_DEFAULT_NUMBER,
    tone: 'southern',
    aiNotes: 'Mention free estimates. Serve Lancaster County and surrounding areas.',
    services: ['Lawn mowing', 'Landscaping design', 'Mulch & edging', 'Sod installation'],
  },
  // Add new clients here — copy the block above and fill in details
};

// ─────────────────────────────────────────────────────────────
// TONE SYSTEM PROMPTS — matches your onboarding form tones
// ─────────────────────────────────────────────────────────────
const TONE_PROMPTS = {
  friendly: 'Warm and conversational. Light emoji occasionally. Feels like a helpful neighbor.',
  professional: 'Polished and businesslike. No slang. Formal but approachable.',
  southern: 'Warm Southern hospitality. Use "y\'all" naturally. Genuine and community-focused.',
  urgent: 'Direct and action-focused. Short sentences. Creates light urgency around scheduling.',
  brief: 'Extremely concise. 1-2 sentences max. Gets straight to the point.',
  premium: 'Elevated and confident. Positions the business as the premium choice.',
};

// ─────────────────────────────────────────────────────────────
// CONVERSATION MEMORY — stores ongoing SMS conversations
// In production use Redis or a database
// ─────────────────────────────────────────────────────────────
const conversations = new Map();
// key: lead phone number, value: { clientId, messages[], leadData, status }

// ─────────────────────────────────────────────────────────────
// CLIENTS — initialize Anthropic + Twilio
// ─────────────────────────────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ─────────────────────────────────────────────────────────────
// HELPER: Build the AI system prompt for a client
// ─────────────────────────────────────────────────────────────
function buildSystemPrompt(client, leadData, isUrgent) {
  const toneDesc = TONE_PROMPTS[client.tone] || TONE_PROMPTS.friendly;
  const urgentNote = isUrgent
    ? '\nIMPORTANT: This is an urgent lead. Prioritize same-day or next-day availability in your first message.'
    : '';

  return `You are an AI follow-up assistant for ${client.name}, a local ${client.niche} company serving ${client.area}.

Your job is to convert incoming leads into booked appointments via text message.

Tone: ${toneDesc}

Business details:
- Services: ${client.services.join(', ')}
- Booking link: ${client.calLink}
- Special instructions: ${client.aiNotes || 'None'}

Rules:
- Keep messages SHORT — this is SMS, not email. 2-4 sentences max.
- Never mention you are an AI. You are a representative of ${client.name}.
- Always end your FIRST message by offering two specific day options (e.g. Tuesday or Thursday).
- Once they confirm a day, suggest a time slot and give the booking link.
- After they confirm time, close with a warm confirmation and what to expect.
- If they ask a question about services or pricing, answer helpfully and briefly, then redirect to booking.
- If they say they're not interested, thank them politely and wish them well. Do not push.
${urgentNote}`;
}

// ─────────────────────────────────────────────────────────────
// HELPER: Score a lead for urgency and priority
// ─────────────────────────────────────────────────────────────
function scoreLead(service, notes) {
  const text = `${service} ${notes}`.toLowerCase();
  const urgentKeywords = ['emergency', 'no ac', 'no heat', '3 day', '4 day', '5 day', 'elderly', 'baby', 'infant', 'flood', 'leak', 'not working'];
  const hotKeywords = ['install', 'replace', 'new system', 'upgrade'];

  let score = 50;
  let isUrgent = false;

  urgentKeywords.forEach(k => {
    if (text.includes(k)) { score += 18; isUrgent = true; }
  });
  hotKeywords.forEach(k => {
    if (text.includes(k)) score += 12;
  });
  if (notes?.length > 30) score += 8;

  return {
    score: Math.min(score, 99),
    isUrgent,
    priority: isUrgent ? 'Rush' : score >= 70 ? 'Hot' : score >= 50 ? 'Warm' : 'Cold'
  };
}

// ─────────────────────────────────────────────────────────────
// HELPER: Send an SMS via Twilio
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// HELPER: Generate AI response via Claude
// ─────────────────────────────────────────────────────────────
async function generateAIResponse(systemPrompt, messages) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages,
    });
    return response.content[0].text;
  } catch (err) {
    console.error('Claude API error:', err.message);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// ROUTE 1: Health check
// ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ApexLeads backend running',
    clients: Object.keys(CLIENTS).length,
    timestamp: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────────────────────
// ROUTE 2: Lead form submission
// POST /lead/:clientId
// Called when a homeowner submits the landing page form
// ─────────────────────────────────────────────────────────────
app.post('/lead/:clientId', async (req, res) => {
  const client = CLIENTS[req.params.clientId];
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const { name, phone, service, city, notes } = req.body;

  // Validate required fields
  if (!name || !phone || !service) {
    return res.status(400).json({ error: 'Name, phone, and service are required' });
  }

  // Clean phone number
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('1')
    ? `+${cleanPhone}`
    : `+1${cleanPhone}`;

  // Score the lead
  const { score, isUrgent, priority } = scoreLead(service, notes);

  // Log the lead
  const lead = {
    id: `lead_${Date.now()}`,
    clientId: client.id,
    name, phone: formattedPhone, service,
    city: city || client.area,
    notes: notes || '',
    score, priority, isUrgent,
    status: 'new',
    createdAt: new Date().toISOString(),
    messages: []
  };

  console.log(`New lead: ${name} → ${client.name} | Score: ${score} | ${priority}${isUrgent ? ' ⚡ URGENT' : ''}`);

  // Build the first AI message
  const systemPrompt = buildSystemPrompt(client, lead, isUrgent);
  const userPrompt = `Write the first text message to this new lead.
Name: ${name}
Service needed: ${service}
Location: ${city || client.area}
Additional info: ${notes || 'none'}
This is the very first message — introduce the business briefly, acknowledge their request, and offer two specific day options this week.`;

  let aiMessage;
  try {
    aiMessage = await generateAIResponse(systemPrompt, [
      { role: 'user', content: userPrompt }
    ]);
  } catch (err) {
    return res.status(500).json({ error: 'AI generation failed', detail: err.message });
  }

  // Store conversation in memory
  conversations.set(formattedPhone, {
    clientId: client.id,
    leadData: lead,
    systemPrompt,
    messages: [
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: aiMessage }
    ],
    status: 'contacted',
    lastActivity: new Date().toISOString()
  });

  // Send the SMS
  const smsResult = await sendSMS(formattedPhone, client.twilioNumber, aiMessage);

  // Respond to the form submission
  res.json({
    success: true,
    leadId: lead.id,
    score,
    priority,
    isUrgent,
    smsSent: smsResult.success,
    // Don't send the AI message back to the browser for security
  });
});

// ─────────────────────────────────────────────────────────────
// ROUTE 3: Incoming SMS reply from lead (Twilio webhook)
// POST /sms/reply
// Twilio calls this URL when a lead texts back
// Set this as your Twilio webhook in the Twilio console
// ─────────────────────────────────────────────────────────────
app.post('/sms/reply', async (req, res) => {
  const { From, Body, To } = req.body;

  if (!From || !Body) {
    return res.status(400).send('Missing fields');
  }

  console.log(`Incoming SMS from ${From}: "${Body}"`);

  // Look up the conversation
  const convo = conversations.get(From);
  if (!convo) {
    // Unknown number — could be a cold texter, ignore
    console.log(`No active conversation for ${From} — ignoring`);
    return res.status(200).send('OK');
  }

  const client = CLIENTS[convo.clientId];
  if (!client) {
    return res.status(500).send('Client config missing');
  }

  // Add their reply to the conversation history
  convo.messages.push({ role: 'user', content: Body });
  convo.lastActivity = new Date().toISOString();

  // Check if they said "not interested" type phrases
  const notInterested = ['stop', 'unsubscribe', 'no thanks', 'not interested', 'remove me'];
  if (notInterested.some(phrase => Body.toLowerCase().includes(phrase))) {
    conversations.delete(From);
    await sendSMS(From, client.twilioNumber, `No problem at all! We've removed you from our list. Have a great day! 😊`);
    return res.status(200).send('OK');
  }

  // Check if they confirmed a booking
  const bookingConfirmed = ['booked', 'confirmed', 'see you', 'perfect', 'great', 'sounds good', 'that works'];
  const isBooked = bookingConfirmed.some(phrase => Body.toLowerCase().includes(phrase))
    && convo.messages.length > 4; // at least 2 exchanges in

  // Generate AI reply
  let aiReply;
  try {
    aiReply = await generateAIResponse(convo.systemPrompt, convo.messages);
  } catch (err) {
    console.error('AI reply failed:', err.message);
    // Fallback — don't leave them hanging
    aiReply = `Thanks for your message! We'll have someone follow up with you shortly. You can also book directly at ${client.calLink}`;
  }

  // Add AI reply to history
  convo.messages.push({ role: 'assistant', content: aiReply });

  // Update status if booked
  if (isBooked) {
    convo.status = 'booked';
    convo.leadData.status = 'booked';
    console.log(`Lead BOOKED: ${convo.leadData.name} → ${client.name}`);
    // In production: update your database here
  }

  // Send the reply
  await sendSMS(From, client.twilioNumber, aiReply);

  // Twilio expects a 200 response
  res.status(200).send('OK');
});

// ─────────────────────────────────────────────────────────────
// ROUTE 4: Get all active leads for dashboard (your eyes only)
// GET /dashboard/leads?secret=YOUR_SECRET
// ─────────────────────────────────────────────────────────────
app.get('/dashboard/leads', (req, res) => {
  if (req.query.secret !== process.env.DASHBOARD_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const leads = [];
  conversations.forEach((convo, phone) => {
    leads.push({
      ...convo.leadData,
      phone: phone.replace(/\d(?=\d{4})/g, '*'), // mask phone for safety
      messageCount: convo.messages.length,
      status: convo.status,
      lastActivity: convo.lastActivity,
    });
  });

  res.json({
    total: leads.length,
    byStatus: {
      new: leads.filter(l => l.status === 'new').length,
      contacted: leads.filter(l => l.status === 'contacted').length,
      booked: leads.filter(l => l.status === 'booked').length,
    },
    leads
  });
});

// ─────────────────────────────────────────────────────────────
// ROUTE 5: Get stats per client
// GET /dashboard/stats/:clientId?secret=YOUR_SECRET
// ─────────────────────────────────────────────────────────────
app.get('/dashboard/stats/:clientId', (req, res) => {
  if (req.query.secret !== process.env.DASHBOARD_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const clientId = req.params.clientId;
  const leads = [];
  conversations.forEach((convo) => {
    if (convo.clientId === clientId) leads.push(convo.leadData);
  });

  const booked = leads.filter(l => l.status === 'booked').length;
  res.json({
    clientId,
    totalLeads: leads.length,
    booked,
    bookingRate: leads.length > 0 ? Math.round((booked / leads.length) * 100) : 0,
    urgentLeads: leads.filter(l => l.isUrgent).length,
  });
});

// ─────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════╗
  ║  ApexLeads backend running         ║
  ║  Port: ${PORT}                        ║
  ║  Clients loaded: ${Object.keys(CLIENTS).length}                 ║
  ╚════════════════════════════════════╝
  `);
});
