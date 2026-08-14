const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
const startTime = Date.now();

// Inisialisasi Google GenAI SDK
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || ""
});

// Database local reader
function getLocalDatabase() {
    try {
        const dbPath = path.join(__dirname, 'database.json');
        const data = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

// Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Logo
app.get('/logo.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'logo.png'));
});

// Surprise Me
app.get('/surprise', (req, res) => {
    const db = getLocalDatabase();
    if (db.length === 0) return res.redirect('/');
    const randomIndex = Math.floor(Math.random() * db.length);
    res.redirect(db[randomIndex].url);
});

// Status Route
app.get('/status', (req, res) => {
    const db = getLocalDatabase();
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>System Status - ChickSearch</title>
            <link rel="icon" type="image/png" href="/logo.png">
            <style>
                body { font-family: monospace; max-width: 650px; margin: 40px auto; padding: 0 15px; line-height: 1.6; }
                a { color: #0000ee; }
            </style>
        </head>
        <body>
            <p><a href="/">&lt;-- Back to Home</a></p>
            <h2>System Diagnostics</h2>
            <hr>
            <p><strong>STATUS:</strong> ONLINE</p>
            <p><strong>AI ENGINE:</strong> Gemini Flash & Pro Thinking</p>
            <p><strong>INDEXED DATABASE:</strong> ${db.length} Pages</p>
            <p><strong>ENGINE UPTIME:</strong> ${uptime} seconds</p>
        </body>
        </html>
    `);
});

// Settings Route (Memperbaiki error Cannot GET /settings)
app.get(['/settings', '/settings.html'], (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Settings - ChickSearch</title>
            <link rel="icon" type="image/png" href="/logo.png">
            <style>
                body {
                    font-family: 'Times New Roman', Times, serif;
                    background-color: #ffffff;
                    color: #000000;
                    margin: 20px auto;
                    max-width: 650px;
                    padding: 0 15px;
                }
                .brand { font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #6a0dad; text-decoration: none; }
                a { color: #0022aa; }
                .card { margin-top: 15px; padding: 15px; border: 1px solid #ccc; font-family: monospace; font-size: 13px; line-height: 1.6; }
            </style>
        </head>
        <body>
            <p><a href="/">&lt;-- Back to Home</a></p>
            <a href="/" class="brand">chick</a> <span style="font-size: 20px; font-weight: bold;">Settings</span>
            <hr>

            <div class="card">
                <p><strong>Search Filters & Preferences:</strong></p>
                <label style="cursor: pointer; display: block; margin-bottom: 10px;">
                    <input type="checkbox" id="safeSearchCheck" onchange="saveSetting()"> 
                    <b>SafeSearch</b>: Filter / Censor adult & unsafe content
                </label>
                <label style="cursor: pointer; display: block; margin-bottom: 10px;">
                    <input type="checkbox" id="liteSearchCheck" onchange="saveSetting()"> 
                    <b>Lite Mode</b>: Fast text-only rendering
                </label>
                <hr style="border: 0; border-top: 1px dashed #ccc; margin: 12px 0;">
                <small style="color: #666;">Preferences are stored locally in your browser.</small>
            </div>

            <script>
                document.getElementById('safeSearchCheck').checked = localStorage.getItem('chick_safesearch') !== 'false';
                document.getElementById('liteSearchCheck').checked = localStorage.getItem('chick_litesearch') === 'true';

                function saveSetting() {
                    localStorage.setItem('chick_safesearch', document.getElementById('safeSearchCheck').checked);
                    localStorage.setItem('chick_litesearch', document.getElementById('liteSearchCheck').checked);
                }
            </script>
        </body>
        </html>
    `);
});

// Helper Prompt Builder yang pintar & responsif ala Google AI Overview
function buildDynamicPrompt(query, context, followUp = null) {
    return `You are ChickSearch's AI Overview engine.
Behavior:
- Understand the user's intent immediately.
- If it's a roleplay, joke, or weird hypothetical scenario (e.g. "I'm a fish seeing a worm on a line", "Help I was born yesterday"), play along in a witty, funny, yet genuinely helpful and structured way.
- If it's a real factual search query, give a sharp, direct summary with scannable bullet points and bold highlights.
- Always output in English.
- Avoid robotic corporate boilerplate phrases. Be natural and adaptive.

Original Search: "${query}"
${followUp ? `User follow-up message: "${followUp}"` : `Available indexed web context: ${JSON.stringify(context)}`}
`;
}

// API Chat Endpoint
app.post('/api/ai-chat', async (req, res) => {
    const userMessage = req.body.message || '';
    const searchContext = req.body.context || '';

    if (!userMessage) return res.status(400).json({ reply: 'Message is empty.' });

    if (process.env.GEMINI_API_KEY) {
        try {
            const prompt = buildDynamicPrompt(searchContext, [], userMessage);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            return res.json({ reply: response.text });
        } catch (err) {
            console.error("AI Chat Error:", err.message);
        }
    }

    return res.json({ 
        reply: `That's an interesting follow-up regarding "${searchContext}"! Let's explore more classic web resources below.` 
    });
});

// Search Route
app.get('/search', async (req, res) => {
    const rawQuery = req.query.q || '';
    const query = rawQuery.toLowerCase().trim();

    if (!query) return res.redirect('/');

    // Quick Calculator
    let calcResultWidget = '';
    if (/^[0-9+\-*/().\s]+$/.test(rawQuery) && rawQuery.length > 1) {
        try {
            const evalResult = eval(rawQuery);
            calcResultWidget = `<p style="margin: 10px 0 20px 0; font-family: monospace; font-size: 14px;"><strong>Calc:</strong> ${rawQuery} = <b>${evalResult}</b></p>`;
        } catch (e) {}
    }

    // Filter Database
    const LOCAL_DATABASE = getLocalDatabase();
    const localResults = LOCAL_DATABASE.filter(item => {
        const title = (item.title || '').toLowerCase();
        const desc = (item.desc || item.description || '').toLowerCase();
        const url = (item.url || '').toLowerCase();
        return title.includes(query) || desc.includes(query) || url.includes(query);
    });

    // AI Overview Generation
    let aiText = '';
    if (process.env.GEMINI_API_KEY) {
        try {
            const prompt = buildDynamicPrompt(rawQuery, localResults.slice(0, 3));
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            aiText = response.text || '';
        } catch (err) {
            console.error("Gemini Search Generation Error:", err.message);
        }
    }

    // Fallback Offline Generator jika API belum respons
    if (!aiText) {
        if (/^(hi|hello|hey|halo)\b/i.test(query)) {
            aiText = `Hi there! 👋 Welcome to ChickSearch. Feel free to ask anything, search vintage portals, or explore our database!`;
        } else if (localResults.length > 0) {
            const points = localResults.slice(0, 3).map(r => `• <b>${r.title}:</b> ${r.desc || r.description}`).join('<br>');
            aiText = `Overview of classic web resources for "<b>${rawQuery}</b>":<br><br>${points}`;
        } else {
            aiText = `No indexed records found for "<b>${rawQuery}</b>" in the vintage web directory. Try searching broader keywords or ask follow-ups below!`;
        }
    }

    const formattedAiText = aiText
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');

    // Generate Daftar Hasil Web
    let resultsHtml = '';
    localResults.forEach(item => {
        const desc = item.desc || item.description || '';
        resultsHtml += `
            <div style="margin-bottom: 22px;">
                <div>
                    <a href="${item.url}" target="_blank" style="font-size: 17px; color: #0022aa; text-decoration: underline;">${item.title}</a>
                </div>
                <div style="color: #006621; font-size: 12px; margin: 1px 0 2px 0; word-break: break-all;">${item.url}</div>
                <div style="color: #000; font-size: 13.5px; line-height: 1.35; max-width: 680px;">${desc}</div>
            </div>
        `;
    });

    if (resultsHtml === '') {
        resultsHtml = `<p style="font-size: 14px; margin-top: 20px;">No results found for "<b>${rawQuery}</b>".</p>`;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${rawQuery} - ChickSearch</title>
            <link rel="icon" type="image/png" href="/logo.png">
            <style>
                body { font-family: 'Times New Roman', Times, serif; background-color: #fff; color: #000; margin: 15px; padding: 0; }
                .header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 20px; }
                .search-box { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 250px; }
                .brand { font-family: Georgia, serif; font-size: 24px; font-weight: bold; color: #6a0dad; text-decoration: none; }
                input[type="text"] { font-family: monospace, sans-serif; font-size: 13px; padding: 4px; width: 100%; max-width: 260px; border: 1px solid #7f9db9; box-sizing: border-box; }
                input[type="submit"], button { font-family: monospace, sans-serif; font-size: 12px; padding: 4px 8px; background: #f0f0f0; border: 1px solid #707070; cursor: pointer; }
                .top-links { font-family: sans-serif; font-size: 13px; white-space: nowrap; }
                .top-links a { color: #6a0dad; text-decoration: none; margin-left: 8px; }

                .ai-card { background-color: #f8f9fa; border: 1px solid #dcdcdc; border-radius: 12px; padding: 16px; margin-bottom: 25px; max-width: 680px; font-family: sans-serif; }
                .ai-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
                .chat-history { font-size: 13.5px; line-height: 1.6; color: #202124; max-height: 350px; overflow-y: auto; margin-bottom: 12px; padding-right: 5px; }
                .msg-bot { margin-bottom: 12px; }
                .msg-user { background: #e8f0fe; padding: 5px 10px; border-radius: 6px; margin: 10px 0 6px 0; display: inline-block; font-weight: bold; font-size: 13px; }
                .chat-input-bar { display: flex; gap: 6px; margin-top: 10px; }
                .chat-input-bar input { flex: 1; padding: 8px 12px; border-radius: 20px; border: 1px solid #ccc; font-family: sans-serif; font-size: 13px; outline: none; }
                .chat-input-bar button { border-radius: 20px; padding: 6px 16px; background: #1a73e8; color: white; border: none; font-family: sans-serif; font-weight: bold; }
                .results-container { max-width: 680px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="search-box">
                    <a href="/" class="brand">chick</a>
                    <form action="/search" method="GET" style="margin: 0; display: flex; gap: 4px; width: 100%;">
                        <input type="text" name="q" value="${rawQuery}" required>
                        <input type="submit" value="Search">
                    </form>
                </div>
                <div class="top-links">
                    <a href="/settings">Settings</a>
                    <a href="/status">Status</a>
                </div>
            </div>

            ${calcResultWidget}

            <div class="ai-card">
                <div class="ai-header">
                    <span style="font-size: 16px;">✨</span>
                    <strong style="font-size: 13px; color: #1a0dab; text-transform: uppercase; letter-spacing: 0.5px;">AI Overview</strong>
                </div>
                
                <div class="chat-history" id="chatHistory">
                    <div class="msg-bot">${formattedAiText}</div>
                </div>

                <div class="chat-input-bar">
                    <input type="text" id="followUpInput" placeholder="Ask follow up..." onkeydown="if(event.key==='Enter') sendChat()">
                    <button type="button" onclick="sendChat()">Ask</button>
                </div>
            </div>

            <div class="results-container">
                ${resultsHtml}
            </div>

            <script>
                async function sendChat() {
                    const input = document.getElementById('followUpInput');
                    const text = input.value.trim();
                    if (!text) return;

                    const history = document.getElementById('chatHistory');
                    history.innerHTML += '<div><span class="msg-user">You: ' + text + '</span></div>';
                    input.value = '';
                    history.scrollTop = history.scrollHeight;

                    const loadId = 'load_' + Date.now();
                    history.innerHTML += '<div class="msg-bot" id="' + loadId + '"><i>Thinking...</i></div>';
                    history.scrollTop = history.scrollHeight;

                    try {
                        const res = await fetch('/api/ai-chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message: text, context: "${rawQuery}" })
                        });
                        const data = await res.json();
                        let replyText = data.reply
                            .replace(/\\*\\*(.*?)\\*\\*/g, '<b>$1</b>')
                            .replace(/\\n/g, '<br>');
                        document.getElementById(loadId).innerHTML = replyText;
                    } catch (e) {
                        document.getElementById(loadId).innerText = "Error connecting to AI service.";
                    }
                    history.scrollTop = history.scrollHeight;
                }
            </script>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ChickSearch running on port ${PORT}`);
});

module.exports = app;