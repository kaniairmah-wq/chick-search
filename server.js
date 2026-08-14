const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));
const startTime = Date.now();

// Inisialisasi SDK Gemini
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || ""
});

// Daftar kata SafeSearch
const ADULT_KEYWORDS = ['porn', 'xxx', 'sex', 'gambling', 'casino', 'slot', 'bokep', 'judi', '18+'];

// Membaca file database.json
function getLocalDatabase() {
    try {
        const dbPath = path.join(__dirname, 'database.json');
        const data = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Gagal membaca database.json:", err.message);
        return [];
    }
}

// Route Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route Logo
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

// API Endpoint Khusus Chat Interaktif AI
app.post('/api/ai-chat', async (req, res) => {
    const userMessage = req.body.message || '';
    const searchContext = req.body.context || '';

    if (!userMessage) {
        return res.status(400).json({ reply: 'Please provide a message.' });
    }

    // Kalau ada API Key, panggil Gemini langsung
    if (process.env.GEMINI_API_KEY) {
        try {
            const prompt = `You are ChickSearch AI Assistant.
Original Search Query Context: "${searchContext}".
User follow-up message: "${userMessage}".

Instructions:
- Reply in a smart, friendly, humanoid conversational tone (English).
- Keep it concise and natural (2-3 sentences max).
- Answer the user's follow up accurately.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            return res.json({ reply: response.text });
        } catch (err) {
            console.error("AI Chat API Error:", err.message);
        }
    }

    // Fallback bot lokal jika API Key belum dipasang
    let fallbackReply = `That's an interesting follow-up regarding "${searchContext}"! As an indexer, I recommend exploring the linked classic directories below.`;
    if (/^(hi|hello|hey)/i.test(userMessage)) {
        fallbackReply = `Hi there! Ask me anything more about "${searchContext}" or explore another query!`;
    }
    return res.json({ reply: fallbackReply });
});

// Main Search Route
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

    // Filter Database Lokal
    const LOCAL_DATABASE = getLocalDatabase();
    const localResults = LOCAL_DATABASE.filter(item => {
        const title = (item.title || '').toLowerCase();
        const desc = (item.desc || item.description || '').toLowerCase();
        const url = (item.url || '').toLowerCase();
        return title.includes(query) || desc.includes(query) || url.includes(query);
    });

    // Inisialisasi Teks AI Pertama Kali
    let initialAiText = '';
    if (/^(hi|hello|hey|halo|sup|yo|hai)(\s+.*)?$/i.test(rawQuery)) {
        initialAiText = `Hi there! 👋 Welcome to ChickSearch. I'm ready to help you explore and answer questions about the classic web.`;
    } else if (process.env.GEMINI_API_KEY) {
        try {
            const prompt = `You are ChickSearch AI Overview.
User search query: "${rawQuery}".
Context: ${JSON.stringify(localResults.slice(0, 3))}.
Summarize briefly in English with a natural friendly tone (2 sentences max).`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            initialAiText = response.text || '';
        } catch (err) {}
    }

    if (!initialAiText) {
        if (localResults.length > 0) {
            initialAiText = `Hi! Found <b>${localResults.length}</b> verified results related to "<b>${rawQuery}</b>". Feel free to ask more details below or browse the entries.`;
        } else {
            initialAiText = `No indexed records found for "<b>${rawQuery}</b>". Ask me anything or explore broader keywords!`;
        }
    }

    // Generate Daftar Web
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
                body {
                    font-family: 'Times New Roman', Times, serif;
                    background-color: #ffffff;
                    color: #000000;
                    margin: 15px;
                    padding: 0;
                }
                .header {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .search-box {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex: 1;
                    min-width: 250px;
                }
                .brand {
                    font-family: Georgia, serif;
                    font-size: 24px;
                    font-weight: bold;
                    color: #6a0dad;
                    text-decoration: none;
                }
                input[type="text"] {
                    font-family: monospace, sans-serif;
                    font-size: 13px;
                    padding: 4px;
                    width: 100%;
                    max-width: 260px;
                    border: 1px solid #7f9db9;
                    box-sizing: border-box;
                }
                input[type="submit"], button {
                    font-family: monospace, sans-serif;
                    font-size: 12px;
                    padding: 4px 8px;
                    background: #f0f0f0;
                    border: 1px solid #707070;
                    cursor: pointer;
                }
                .top-links {
                    font-family: sans-serif;
                    font-size: 13px;
                    white-space: nowrap;
                }
                .top-links a {
                    color: #6a0dad;
                    text-decoration: none;
                    margin-left: 8px;
                }

                /* AI Overview & Chat Style */
                .ai-card {
                    background-color: #f8f9fa;
                    border: 1px solid #dcdcdc;
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 25px;
                    max-width: 680px;
                    font-family: sans-serif;
                }
                .ai-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                .chat-history {
                    font-size: 13.5px;
                    line-height: 1.5;
                    color: #202124;
                    max-height: 280px;
                    overflow-y: auto;
                    margin-bottom: 12px;
                    padding-right: 5px;
                }
                .msg-bot {
                    margin-bottom: 10px;
                }
                .msg-user {
                    background: #e8f0fe;
                    padding: 6px 10px;
                    border-radius: 6px;
                    margin: 8px 0;
                    display: inline-block;
                    font-weight: bold;
                }
                .chat-input-bar {
                    display: flex;
                    gap: 6px;
                    margin-top: 10px;
                }
                .chat-input-bar input {
                    flex: 1;
                    padding: 6px 10px;
                    border-radius: 20px;
                    border: 1px solid #ccc;
                    font-family: sans-serif;
                    font-size: 13px;
                    outline: none;
                }
                .chat-input-bar button {
                    border-radius: 20px;
                    padding: 6px 14px;
                    background: #1a73e8;
                    color: white;
                    border: none;
                }
                .results-container {
                    max-width: 680px;
                }
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

            <!-- Interactive AI Overview Card -->
            <div class="ai-card">
                <div class="ai-header">
                    <span style="font-size: 16px;">✨</span>
                    <strong style="font-size: 13px; color: #1a0dab; text-transform: uppercase; letter-spacing: 0.5px;">AI Overview</strong>
                </div>
                
                <div class="chat-history" id="chatHistory">
                    <div class="msg-bot">${initialAiText}</div>
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
                    
                    // Render User Message
                    history.innerHTML += '<div><span class="msg-user">You: ' + text + '</span></div>';
                    input.value = '';
                    history.scrollTop = history.scrollHeight;

                    // Loading indicator
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
                        document.getElementById(loadId).innerHTML = data.reply.replace(/\\n/g, '<br>');
                    } catch (e) {
                        document.getElementById(loadId).innerText = "Sorry, couldn't get a response right now.";
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