// api/run-scheduler.js
import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Optional: protect with a simple key
  if (req.query.secret !== process.env.SCHEDULE_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  const client = await MongoClient.connect(process.env.MONGO_URI);
  const col = client.db().collection('scheduled_calls');
  const now = new Date();

  const due = await col.find({ called: false, runAt: { $lte: now } }).toArray();
  for (let job of due) {
    const callRes = await fetch(
      `https://${process.env.VERCEL_URL}/api/cron-call`,
      { method: 'POST', headers: { 'x-schedule-secret': process.env.SCHEDULE_SECRET } }
    );
    if (callRes.ok) {
      const { sid } = await callRes.json().catch(() => ({}));
      await col.updateOne(
        { _id: job._id },
        { $set: { called: true, sid } }
      );
    }
  }

  await client.close();
  return res.status(200).json({ processed: due.length });
}
