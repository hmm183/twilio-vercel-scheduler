// api/run-scheduler.js
import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Only GET allowed');
  if (req.query.secret !== process.env.SCHEDULE_SECRET) {
    console.warn('[run-scheduler] Invalid secret:', req.query.secret);
    return res.status(401).send('Unauthorized');
  }

  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URI);
    const col = client.db().collection('scheduled_calls');
    const now = new Date();

    console.log(`[run-scheduler] Checking jobs ≤ ${now.toISOString()}`);
    const due = await col.find({ called: false, runAt: { $lte: now } }).toArray();
    console.log(`[run-scheduler] Found ${due.length} job(s) due`);

    let processed = 0;
    for (const job of due) {
      console.log(`[run-scheduler] Triggering cron-call for job ${job._id} (runAt=${job.runAt.toISOString()})`);
      try {
        const endpoint = `https://${process.env.VERCEL_APP_URL}/api/cron-call`;
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'x-schedule-secret': process.env.SCHEDULE_SECRET }
        });
        const text = await resp.text();
        console.log(`[run-scheduler] cron-call response: ${resp.status} – ${text}`);

        if (resp.ok) {
          await col.updateOne(
            { _id: job._id },
            { $set: { called: true, sid: JSON.parse(text).sid || null } }
          );
          console.log(`[run-scheduler] Marked job ${job._id} called=true`);
          processed++;
        } else {
          console.error(`[run-scheduler] cron-call failed for job ${job._id}`);
        }
      } catch (err) {
        console.error(`[run-scheduler] Error triggering cron-call for job ${job._id}:`, err);
      }
    }

    res.status(200).json({ processed });
  } catch (err) {
    console.error('[run-scheduler] Fatal error:', err);
    res.status(500).send('Internal Server Error');
  } finally {
    if (client) await client.close();
  }
}
