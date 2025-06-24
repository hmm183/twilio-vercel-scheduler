// api/delete-call.js
import { getScheduledCallsCollection } from '../lib/scheduled_calls.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();

  const { id } = req.query;
  if (!id) return res.status(400).send('Missing id');

  const col = await getScheduledCallsCollection();
  const result = await col.deleteOne({ _id: id });

  if (result.deletedCount === 0) {
    return res.status(404).send('Job not found');
  }
  res.status(200).send('✅ Job deleted');
}
