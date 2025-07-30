require('dotenv').config();
const { Twilio } = require('twilio');

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const { to, leadInfo } = JSON.parse(event.body);
    if (!to) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Phone number "to" is required.' }) };
    }
    const twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const functionUrl = event.headers.host;
    try {
        await twilioClient.calls.create({
            to: to,
            from: process.env.TWILIO_PHONE_NUMBER,
            url: `https://${functionUrl}/api/inbound-voice?contact=${encodeURIComponent(leadInfo.contact)}&company=${encodeURIComponent(leadInfo.company)}&outbound=true`,
        });
        return { statusCode: 200, body: JSON.stringify({ message: 'Call initiated' }) };
    } catch (error) {
        console.error("Twilio Error:", error);
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
