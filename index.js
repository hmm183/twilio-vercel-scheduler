import express from 'express';
import { Octokit } from '@octokit/rest';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GitHub settings
const OWNER = 'YOUR_GITHUB_USERNAME';
const REPO  = 'twilio-scheduler-express';
const PATH  = 'api/jobs.json';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// 1. Schedule endpoint: add job to jobs.json
app.post('/api/schedule', async (req, res) => {
  const { phone, runAt } = req.body;
  if (!phone || !runAt) return res.status(400).json({ error: 'Missing phone or runAt' });

  // Fetch current jobs.json
  const { data: file } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path: PATH });
  const content = JSON.parse(Buffer.from(file.content, 'base64').toString());

  // Append new job
  content.jobs.push({ id: uuidv4(), phone, runAt, called: false });

  // Commit update
  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER, repo: REPO, path: PATH,
    message: `schedule: ${phone} @ ${runAt}`,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
    sha: file.sha
  });

  res.json({ ok: true });
});

// 2. Cron-call endpoint: trigger Twilio call
app.post('/api/cron-call', async (req, res) => {
  if (req.headers['x-schedule-secret'] !== process.env.SCHEDULE_SECRET) return res.status(401).end();

  const client = (await import('twilio')).Twilio(
    process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN
  );

  const call = await client.calls.create({
    to:   process.env.TWILIO_TO_NUMBER,
    from: process.env.TWILIO_FROM_NUMBER,
    url:  `https://${process.env.VERCEL_URL}/api/twiml`
  });

  console.log('Called:', call.sid);
  res.json({ sid: call.sid });
});

// 3. TwiML endpoint: call script
app.get('/api/twiml', (req, res) => {
  res.type('application/xml').send(
    `<Response><Say voice="alice">Hello! This is your scheduled reminder.</Say></Response>`
  );
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
