const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const startTime = Date.now();

// Daftar kata yang disensor kalau SafeSearch aktif
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

// Homepage Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route Khusus Favicon & Logo
app.get('/logo.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'logo.png'));
});

// Fitur Surprise Me (Random Site Redirect)
app.get('/surprise', (req, res) => {
    const db = getLocalDatabase();
    if (db.length === 0) return res.redirect('/');
    const randomIndex = Math.floor(Math.random() * db.length);
    res.redirect(db[randomIndex].url);
});

// Fitur System Status Diagnostic
app.get('/status', (req, res) => {
    const db = getLocalDatabase();
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>System Status - ChickSearch</title>
            <link rel="icon" type="image/png" href="/logo.png">
            <style>
                body { font-family: monospace; max-width: 650px; margin: 40px auto; padding: 0 10px; line-height: 1.6; }
                a { color: #0000ee; }
            </style>
        </head>
        <body>
            <p><a href="/">&lt;-- Back to Home</a></p>
            <h2>System Diagnostics</h2>
            <hr>
            <p><strong>STATUS:</strong> ONLINE</p>
            <p><strong>INDEXED DATABASE:</strong> ${db.length} Pages & Sub-Webs</p>
            <p><strong>ENGINE UPTIME:</strong> ${uptime} seconds</p>
            <p><strong>MEMORY USAGE:</strong> ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB</p>
        </body>
        </html>
    `);
});

// Halaman Settings Ala Wiby
app.get('/settings', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
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
                }
                button {
                    margin-top: 15px;
                    padding: 4px 10px;
                    font-family: monospace;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <p><a href="/">&lt;-- Back to Home</a></p>
            <a href="/" class="brand">chick</a> <span style="font-size: 20px; font-weight: bold;">Settings</span>
            <hr>

            <div class="card">
                <p><strong>Search Filters & Preferences</strong></p>
                <label style="cursor: pointer;">
                    <input type="checkbox" id="safeSearchCheck" onchange="saveSetting()"> 
                    <b>Filter / Censor adult & unsafe content</b> (SafeSearch)
                </label>
                <br><br>
                <small style="color: #666;">Settings are automatically saved in your browser cookie/localStorage.</small>
            </div>

            <script>
                // Load preference
                const isSafe = localStorage.getItem('chick_safesearch') !== 'false';
                document.getElementById('safeSearchCheck').checked = isSafe;

                function saveSetting() {
                    const checked = document.getElementById('safeSearchCheck').checked;
                    localStorage.setItem('chick_safesearch', checked);
                    alert('Settings updated!');
                }
            </script>
        </body>
        </html>
    `);
});

// Main Search Route
app.get('/search', (req, res) => {
    const rawQuery = req.query.q || '';
    const query = rawQuery.toLowerCase().trim();
    const safeMode = req.query.safe !== '0'; // default safe search aktif

    if (!query) return res.redirect('/');

    // Quick Calculator Widget
    let calcResultWidget = '';
    if (/^[0-9+\-*/().\s]+$/.test(rawQuery) && rawQuery.length > 1) {
        try {
            const evalResult = eval(rawQuery);
            calcResultWidget = `<p style="margin: 10px 0 20px 0; font-family: monospace; font-size: 14px;"><strong>Calc:</strong> ${rawQuery} = <b>${evalResult}</b></p>`;
        } catch (e) {}
    }

    // Filter dari Database Lokal (Mencakup title, desc, url, sub-path & keywords)
    const LOCAL_DATABASE = getLocalDatabase();
    const localResults = LOCAL_DATABASE.filter(item => {
        const title = (item.title || '').toLowerCase();
        const desc = (item.desc || item.description || '').toLowerCase();
        const url = (item.url || '').toLowerCase();
        const keywords = Array.isArray(item.keywords) ? item.keywords.join(' ').toLowerCase() : (item.keywords || '').toLowerCase();

        // 1. Cek apakah cocok sama query pencarian (termasuk url sub-path)
        const isMatch = title.includes(query) || desc.includes(query) || url.includes(query) || keywords.includes(query);
        if (!isMatch) return false;

        // 2. Cek Sensor Konten Dewasa
        if (safeMode) {
            const isAdult = ADULT_KEYWORDS.some(badWord => 
                title.includes(badWord) || desc.includes(badWord) || url.includes(badWord) || keywords.includes(badWord)
            );
            if (isAdult) return false;
        }

        return true;
    });

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
        resultsHtml = `<p style="font-size: 14px; margin-top: 20px;">No direct matches found in index for "<b>${rawQuery}</b>".</p>`;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <title>${rawQuery} - ChickSearch</title>
            <link rel="icon" type="image/png" href="/logo.png">
            <style>
                body {
                    font-family: 'Times New Roman', Times, serif;
                    background-color: #ffffff;
                    color: #000000;
                    margin: 15px 25px;
                    padding: 0;
                }
                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 25px;
                }
                .search-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .brand {
                    font-family: Georgia, serif;
                    font-size: 26px;
                    font-weight: bold;
                    color: #6a0dad;
                    text-decoration: none;
                }
                input[type="text"] {
                    font-family: monospace, sans-serif;
                    font-size: 13px;
                    padding: 2px 4px;
                    width: 260px;
                    border: 1px solid #7f9db9;
                }
                input[type="submit"] {
                    font-family: monospace, sans-serif;
                    font-size: 12px;
                    padding: 2px 6px;
                    background: #f0f0f0;
                    border: 1px solid #707070;
                    cursor: pointer;
                }
                .top-link {
                    color: #6a0dad;
                    font-size: 13px;
                    font-family: sans-serif;
                    text-decoration: none;
                    margin-left: 12px;
                }
                .top-link:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="search-box">
                    <a href="/" class="brand">chick</a>
                    <form action="/search" method="GET" style="margin: 0; display: inline;" onsubmit="attachSafeParam(this)">
                        <input type="text" name="q" value="${rawQuery}" required>
                        <input type="hidden" name="safe" id="safeInput" value="1">
                        <input type="submit" value="Search">
                    </form>
                </div>
                <div>
                    <a href="/settings" class="top-link">Settings</a>
                    <a href="/status" class="top-link">Status</a>
                </div>
            </div>

            ${calcResultWidget}

            <div class="results-container">
                ${resultsHtml}
            </div>

            <script>
                function attachSafeParam(form) {
                    const isSafe = localStorage.getItem('chick_safesearch') !== 'false';
                    form.querySelector('#safeInput').value = isSafe ? '1' : '0';
                }
            </script>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ChickSearch engine running on port ${PORT}`);
});

module.exports = app;