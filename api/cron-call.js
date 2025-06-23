// api/cron-call.js
import Twilio from "twilio";

export default async function handler(req, res) {
  const client = Twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const call = await client.calls.create({
    to:   process.env.TWILIO_TO_NUMBER,
    from: process.env.TWILIO_FROM_NUMBER,
    url:  `${process.env.VERCEL_URL}/api/twiml`
  });

  console.log("Called:", call.sid);
  return res.status(200).json({ sid: call.sid });
}
