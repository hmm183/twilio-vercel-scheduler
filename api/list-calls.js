// api/list-calls.js
import { getScheduledCallsCollection } from '../lib/scheduled_calls.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const col = await getScheduledCallsCollection();
  const jobs = await col.find({}).sort({ runAt: 1 }).toArray();
  res.status(200).json(jobs);
}
