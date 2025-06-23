// api/twiml.js
export default function handler(req, res) {
  res
    .setHeader("Content-Type", "application/xml")
    .status(200)
    .send(`
      <Response>
        <Say voice="alice">
          Hello! This is your scheduled reminder from Twilio.
        </Say>
      </Response>
    `);
}
