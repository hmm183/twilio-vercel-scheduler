// lib/scheduled_calls.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI;
if (!uri) throw new Error('MONGO_URI not set');

let clientPromise;
if (!global._mongoClientPromise) {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export async function getScheduledCallsCollection() {
  const client = await clientPromise;
  const db = client.db();             // uses default DB from URI
  return db.collection('scheduled_calls');
}
