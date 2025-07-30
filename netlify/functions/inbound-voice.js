const { twiml } = require('twilio');
const Pusher = require('pusher');

exports.handler = async function(event) {
    const { From, CallSid, outbound, contact, company } = event.queryStringParameters;
    const pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true
    });
    const response = new twiml.VoiceResponse();
    let initialMessage;

    if (outbound === 'true') {
        initialMessage = `Bonjour ${decodeURIComponent(contact)}, ici l'agent IA de AIBotsAutomations. Est-ce un bon moment pour discuter de l'expo AfriLab?`;
        pusher.trigger('call-events', 'outbound-answered', { company: decodeURIComponent(company) });
    } else {
        initialMessage = "Merci d'avoir appelé AIBotsAutomations. Comment puis-je vous aider aujourd'hui ?";
        pusher.trigger('call-events', 'inbound-call', { from: From, callSid: CallSid });
    }
    
    response.say({ voice: 'Polly.Lea', language: 'fr-FR' }, initialMessage);
    pusher.trigger('call-events', 'ai-speech', { text: initialMessage });
    
    response.gather({
        speechTimeout: 'auto',
        input: 'speech',
        action: `/api/handle-transcription?callSid=${CallSid}`,
        language: 'fr-FR',
    });
    
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: response.toString(),
    };
};
