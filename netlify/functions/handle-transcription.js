require('dotenv').config();
const { twiml } = require('twilio');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Pusher = require('pusher');

// ATTENTION: Ce stockage en mémoire est simple et sera réinitialisé à chaque déploiement.
// Pour une application de production, utilisez une base de données comme FaunaDB ou Firebase.
const chatHistories = {};

exports.handler = async function(event) {
    const body = new URLSearchParams(event.body);
    const SpeechResult = body.get('SpeechResult');
    const CallSid = event.queryStringParameters.callSid;

    const pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true
    });

    pusher.trigger('call-events', 'user-speech', { text: SpeechResult });

    if (!chatHistories[CallSid]) {
        chatHistories[CallSid] = [{
            role: "system",
            parts: [{ text: "Tu es un agent commercial IA, expert de l'événement AfriLab. Tu parles français. Sois concis et professionnel." }]
        }];
    }
    chatHistories[CallSid].push({ role: "user", parts: [{ text: SpeechResult }] });

    let aiResponseText = "Désolé, je n'ai pas bien compris. Pouvez-vous répéter ?";
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const chat = model.startChat({ history: chatHistories[CallSid] });
        const result = await chat.sendMessage(SpeechResult);
        aiResponseText = result.response.text();
        chatHistories[CallSid].push({ role: "model", parts: [{ text: aiResponseText }] });
    } catch (error) {
        console.error("Gemini Error:", error);
    }

    pusher.trigger('call-events', 'ai-speech', { text: aiResponseText });

    const response = new twiml.VoiceResponse();
    response.say({ voice: 'Polly.Lea', language: 'fr-FR' }, aiResponseText);
    
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
