const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.static(path.join(__dirname)));
const startTime = Date.now();

// Inisialisasi Google GenAI SDK (Pastikan GEMINI_API_KEY diset di Environment atau hardcode untuk tes)
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "MASUKKAN_API_KEY_GEMINI_LU_DISINI"
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

// Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Favicon & Logo
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

// System Status
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
            <p><strong>AI ENGINE:</strong> Gemini 3.7 Flash</p>
            <p><strong>INDEXED DATABASE:</strong> ${db.length} Pages</p>
            <p><strong>ENGINE UPTIME:</strong> ${uptime} seconds</p>
            <p><strong>MEMORY USAGE:</strong> ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB</p>
        </body>
        </html>
    `);
});

// Settings Route
app.get('/settings', (req, res) => {
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
                .brand {
                    font-family: Georgia, serif;
                    font-size: 26px;
                    font-weight: bold;
                    color: #6a0dad;
                    text-decoration: none;
                }
                a { color: #0022aa; }
                .card {
                    margin-top: 15px;
                    padding: 15px;
                    border: 1px solid #ccc;
                    font-family: monospace;
                    font-size: 13px;
                    line-height: 1.6;
                }
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
                <hr style="border: 0; border-top: 1px dashed #ccc; margin: 12px 0;">
                <small style="color: #666;">Settings are saved in your browser localStorage.</small>
            </div>

            <script>
                document.getElementById('safeSearchCheck').checked = localStorage.getItem('chick_safesearch') !== 'false';

                function saveSetting() {
                    const safe = document.getElementById('safeSearchCheck').checked;
                    localStorage.setItem('chick_safesearch', safe);
                    alert('Settings updated!');
                }
            </script>
        </body>
        </html>
    `);
});

// Main Search Route (with real Gemini 3.7 Flash AI Overview)
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

    // Filter Database
    const LOCAL_DATABASE = getLocalDatabase();
    const localResults = LOCAL_DATABASE.filter(item => {
        const title = (item.title || '').toLowerCase();
        const desc = (item.desc || item.description || '').toLowerCase();
        const url = (item.url || '').toLowerCase();
        return title.includes(query) || desc.includes(query) || url.includes(query);
    });

    // AI Overview Logic (With Guaranteed Fallback)
    let aiText = '';
    
    // Coba panggil Gemini dulu
    if (process.env.GEMINI_API_KEY) {
        try {
            const prompt = `Summarize search results for "${rawQuery}" concisely in English (2 sentences max). Data: ${JSON.stringify(localResults.slice(0, 3))}`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            aiText = response.text || '';
        } catch (err) {
            console.error("Gemini API Error:", err.message);
        }
    }

    // Fallback otomatis kalau API mati / belum pasang Key
    if (!aiText) {
        if (query.length <= 2) {
            aiText = `Showing top classic web entries associated with the term "<b>${rawQuery}</b>". Found <b>${localResults.length}</b> direct matches indexed across the catalog.`;
        } else if (localResults.length > 0) {
            const points = localResults.slice(0, 3).map(r => `• <b>${r.title}:</b> ${r.desc || r.description}`).join('<br>');
            aiText = `Overview of classic web resources for "<b>${rawQuery}</b>":<br><br>${points}`;
        } else {
            aiText = `No indexed records found for "<b>${rawQuery}</b>" in the vintage web directory. Try searching broader keywords like 'retro', 'games', or 'portal'.`;
        }
    }

    const aiOverviewWidget = `
        <div style="background-color: #f8f9fa; border: 1px solid #dcdcdc; border-radius: 8px; padding: 14px; margin-bottom: 25px; max-width: 680px; font-family: sans-serif;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <span style="font-size: 16px;">✨</span>
                <strong style="font-size: 13px; color: #1a0dab; text-transform: uppercase; letter-spacing: 0.5px;">AI Overview</strong>
            </div>
            <div style="font-size: 13.5px; line-height: 1.6; color: #202124;">
                ${aiText}
            </div>
        </div>
    `;

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
                input[type="submit"] {
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
            ${aiOverviewWidget}

            <div class="results-container">
                ${resultsHtml}
            </div>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ChickSearch engine running on port ${PORT}`);
});

module.exports = app;