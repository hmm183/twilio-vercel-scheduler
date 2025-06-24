// api/schedule.mjs
import { v4 as uuidv4 } from 'uuid';
import { getScheduledCallsCollection } from '../lib/scheduled_calls.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { runAt } = req.body;
  if (!runAt) return res.status(400).send('Missing runAt');

  const date = new Date(runAt);
  if (isNaN(date.getTime())) return res.status(400).send('Invalid date');

  const isoRunAt = date.toISOString();
  const col = await getScheduledCallsCollection();

  await col.insertOne({
    _id: uuidv4(),
    runAt: new Date(isoRunAt),
    called: false,
    createdAt: new Date(),
    sid: null
  });

  res.status(200).send('✅ Call scheduled');
}
