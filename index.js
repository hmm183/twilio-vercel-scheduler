import express from 'express';
import { Octokit } from '@octokit/rest';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GitHub + Twilio Configuration
const OWNER        = 'hmm183';
const REPO         = 'twilio-vercel-scheduler';
const JOBS_PATH    = 'api/jobs.json';
const octokit      = new Octokit({ auth: process.env.GITHUB_TOKEN });
const TWILIO_FROM  = process.env.TWILIO_FROM_NUMBER;
const TWILIO_TO    = process.env.TWILIO_TO_NUMBER;

// 1. POST /api/schedule → add a job
app.post('/api/schedule', async (req, res) => {
  const { runAt } = req.body;
  if (!runAt) return res.status(400).send('Missing runAt');

  // Fetch current jobs.json
  const { data: file } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path: JOBS_PATH });
  const jobsData = JSON.parse(Buffer.from(file.content, 'base64').toString());

  // Append new job
  jobsData.jobs.push({ id: uuidv4(), runAt, called: false });

  // Commit update
  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: JOBS_PATH,
    message: `schedule call @ ${runAt}`,
    content: Buffer.from(JSON.stringify(jobsData, null, 2)).toString('base64'),
    sha: file.sha
  });

  res.send('ok');
});

// 2. POST /api/cron-call → trigger Twilio call
app.post('/api/cron-call', async (req, res) => {
  if (req.headers['x-schedule-secret'] !== process.env.SCHEDULE_SECRET) {
    return res.status(401).send('unauthorized');
  }

  const { Twilio } = await import('twilio');
  const client = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  const call = await client.calls.create({
    to:   TWILIO_TO,
    from: TWILIO_FROM,
    url:  `https://${process.env.VERCEL_URL}/api/twiml`
  });

  console.log('Called:', call.sid);
  res.json({ sid: call.sid });
});

// 3. GET /api/twiml → TwiML response
app.get('/api/twiml', (req, res) => {
  res.type('application/xml').send(`
    <Response>
      <Say voice="alice">Hello! This is your scheduled reminder.</Say>
    </Response>
  `);
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));