document.addEventListener('DOMContentLoaded', () => {
    const config = {
        // IMPORTANT: Remplissez ces valeurs !
        pusherKey: "REMPLACEZ_PAR_VOTRE_PUSHER_KEY",
        pusherCluster: "REMPLACEZ_PAR_VOTRE_PUSHER_CLUSTER"
    };

    // DOM Elements
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    const loginForm = document.getElementById('login-form');
    const transcript = document.getElementById('transcript');
    const callStatusBar = document.getElementById('call-status-bar');
    const callStatusText = document.getElementById('call-status-text');
    const callTimer = document.getElementById('call-timer');
    const leadsContainer = document.getElementById('leads-container');

    // App State
    let leads = [
        { id: 1, company: "PharmaPlus", contact: "Dr. Aline F.", phone: "+21622123456" },
        { id: 2, company: "BioMed Equip", contact: "Mr. Sami K.", phone: "+21655987654" },
        { id: 3, company: "InnovHealth TN", contact: "Mme. Leila B.", phone: "+21698112233" },
    ];
    let currentCall = null;
    let callInterval;

    function setupPusher() {
        if (!config.pusherKey || config.pusherKey.includes("REMPLACEZ")) {
            addMessage('Agent', "ERREUR : La configuration temps-réel (Pusher) est manquante dans script.js.");
            return;
        }
        const pusher = new Pusher(config.pusherKey, { cluster: config.pusherCluster });
        const channel = pusher.subscribe('call-events');

        channel.bind_global((eventName, data) => {
            console.log(`Pusher event: ${eventName}`, data);
        });

        channel.bind('inbound-call', (data) => {
            transcript.innerHTML = '';
            addMessage('Agent', `Appel entrant de ${data.from}...`);
            startCallTimer();
        });
        channel.bind('outbound-answered', (data) => {
            if (currentCall && currentCall.company === data.company) {
                 currentCall.status = "Connecté";
                 updateCallStatusUI();
            }
        });
        channel.bind('user-speech', (data) => addMessage('Client', data.text));
        channel.bind('ai-speech', (data) => addMessage('Agent', data.text));
    }

    function addMessage(sender, message) {
        const messageElement = document.createElement('div');
        const isBot = sender === 'Agent';
        const avatar = isBot ? '🤖' : '🧑';
        const senderClass = isBot ? 'text-indigo-300' : 'text-green-300';
        const alignClass = isBot ? 'items-start' : 'items-end';
        const bubbleClass = isBot ? 'bg-gray-700' : 'bg-gray-700/50';

        messageElement.className = `flex flex-col ${alignClass} gap-1`;
        messageElement.innerHTML = `
            <span class="text-xs font-bold ${senderClass}">${sender}</span>
            <div class="max-w-md p-3 rounded-lg ${bubbleClass}">
                <p class="text-sm text-white">${message}</p>
            </div>`;
        transcript.appendChild(messageElement);
        transcript.scrollTop = transcript.scrollHeight;
    }

    function renderLeads() {
        leadsContainer.innerHTML = '';
        leads.forEach(lead => {
            const leadCard = document.createElement('div');
            leadCard.className = 'bg-gray-700/50 p-3 rounded-lg hover:bg-gray-700 transition-colors';
            leadCard.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-semibold text-indigo-300">${lead.company}</p>
                        <p class="text-sm text-gray-400">${lead.contact}</p>
                    </div>
                    <button data-lead-id="${lead.id}" class="call-btn bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-full text-sm transition-transform hover:scale-105">
                        Appeler
                    </button>
                </div>`;
            leadsContainer.appendChild(leadCard);
        });
    }

    async function startCall(leadId) {
        if (currentCall) { addMessage('Agent', 'Un appel est déjà en cours.'); return; }
        const lead = leads.find(l => l.id === leadId);
        currentCall = { leadId: lead.id, company: lead.company, status: "Initialisation..." };
        transcript.innerHTML = '';
        addMessage('Agent', `Lancement de l'appel vers ${lead.company}...`);
        updateCallStatusUI();
        startCallTimer();
        
        try {
            const response = await fetch('/api/make-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: lead.phone, leadInfo: { contact: lead.contact, company: lead.company } })
            });
            if (!response.ok) throw new Error('La fonction backend a échoué.');
            currentCall.status = "Sonnerie...";
            updateCallStatusUI();
        } catch (error) {
            addMessage('Agent', `Erreur lors de l'appel : ${error.message}`);
            endCall();
        }
    }

    function updateCallStatusUI() {
        if (!currentCall) { callStatusBar.classList.add('hidden'); return; }
        callStatusBar.classList.remove('hidden');
        callStatusText.textContent = `${currentCall.status} (${currentCall.company})`;
        if (!document.getElementById('end-call-btn')) {
            const endCallBtn = document.createElement('button');
            endCallBtn.id = 'end-call-btn';
            endCallBtn.textContent = 'Terminer';
            endCallBtn.className = 'bg-red-600 hover:bg-red-500 text-white font-semibold py-1 px-3 rounded-lg text-sm';
            callStatusBar.appendChild(endCallBtn);
            endCallBtn.onclick = () => endCall();
        }
    }

    function startCallTimer() {
        clearInterval(callInterval);
        let seconds = 0;
        callTimer.textContent = '00:00';
        callInterval = setInterval(() => {
            seconds++;
            const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            const secs = (seconds % 60).toString().padStart(2, '0');
            callTimer.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    function endCall() {
        if (!currentCall) return;
        clearInterval(callInterval);
        addMessage('Agent', 'Appel terminé.');
        currentCall = null;
        callStatusBar.classList.add('hidden');
        document.getElementById('end-call-btn')?.remove();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        renderLeads();
        setupPusher();
        addMessage('Agent', 'Système prêt. Sélectionnez un lead à appeler.');
    });

    leadsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('call-btn')) {
            startCall(parseInt(e.target.dataset.leadId, 10));
        }
    });
});
