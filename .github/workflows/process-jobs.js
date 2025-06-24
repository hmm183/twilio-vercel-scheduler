// .github/workflows/process-jobs.js
const { MongoClient } = require('mongodb');
const fetch = require('node-fetch');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set');

  console.log('[START] Connecting to MongoDB');
  const client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = client.db(); // default database from URI
  const col = db.collection('scheduled_calls');

  const now = new Date();
  console.log(`[CHECK] ${now.toISOString()}: Finding due jobs…`);
  const dueJobs = await col.find({ called: false, runAt: { $lte: now } }).toArray();
  console.log(`[FOUND] ${dueJobs.length} job(s) due`);

  for (const job of dueJobs) {
    console.log(`[TRIGGER] Job ${job._id} scheduled at ${job.runAt.toISOString()}`);
    try {
      const res = await fetch(`https://${process.env.VERCEL_APP_URL}/api/cron-call`, {
        method: 'POST',
        headers: { 'x-schedule-secret': process.env.SCHEDULE_SECRET }
      });
      const text = await res.text();
      console.log(`[RESPONSE] ${res.status}: ${text}`);

      if (res.ok) {
        // assume JSON { sid: 'CAxxx' }
        let sid = null;
        try {
          sid = JSON.parse(text).sid;
        } catch {}

        await col.updateOne(
          { _id: job._id },
          { $set: { called: true, sid } }
        );
        console.log(`[UPDATE] Marked ${job._id} called=true`);
      } else {
        console.warn(`[SKIP] Not marking job ${job._id} due to error`);
      }
    } catch (err) {
      console.error(`[ERROR] Processing job ${job._id}:`, err);
    }
  }

  await client.close();
  console.log('[DONE] Scheduler run complete');
}

main().catch(err => {
  console.error('[FATAL] Scheduler crashed:', err);
  process.exit(1);
});
