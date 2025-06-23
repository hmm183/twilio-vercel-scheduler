// api/cron-call.js
import Twilio from "twilio";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (req.headers["x-schedule-secret"] !== process.env.SCHEDULE_SECRET) {
    return res.status(401).send("unauthorized");
  }

  const client = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const call = await client.calls.create({
    to:   process.env.TWILIO_TO_NUMBER,
    from: process.env.TWILIO_FROM_NUMBER,
    url:  `https://${process.env.VERCEL_URL}/api/twiml`,
  });

  res.status(200).json({ sid: call.sid });
}
