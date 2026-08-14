const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.static(path.join(__dirname)));
const startTime = Date.now();

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

// ROUTE KHUSUS LOGO GAMBAR
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

// Fitur System Status Diagnostic (Minimalis Wiby Style)
app.get('/status', (req, res) => {
    const db = getLocalDatabase();
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>System Status - ChickSearch</title>
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
            <p><strong>INDEXED DATABASE:</strong> ${db.length} Websites</p>
            <p><strong>ENGINE UPTIME:</strong> ${uptime} seconds</p>
            <p><strong>MEMORY USAGE:</strong> ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB</p>
        </body>
        </html>
    `);
});

// Main Search Route
app.get('/search', (req, res) => {
    const rawQuery = req.query.q || '';
    const query = rawQuery.toLowerCase().trim();

    if (!query) return res.redirect('/');

    // Quick Calculator Widget
    let calcResultWidget = '';
    if (/^[0-9+\-*/().\s]+$/.test(rawQuery) && rawQuery.length > 1) {
        try {
            const evalResult = eval(rawQuery);
            calcResultWidget = `<p style="background: #f4f4f4; border-left: 3px solid #000; padding: 8px;"><strong>Calc:</strong> ${rawQuery} = <b>${evalResult}</b></p><br>`;
        } catch (e) {}
    }

    // Filter dari Database Lokal (Aman dari crash undefined)
    const LOCAL_DATABASE = getLocalDatabase();
    const localResults = LOCAL_DATABASE.filter(item => {
        const title = (item.title || '').toLowerCase();
        const desc = (item.desc || item.description || '').toLowerCase();
        const url = (item.url || '').toLowerCase();
        return title.includes(query) || desc.includes(query) || url.includes(query);
    });

    let resultsHtml = '';
    localResults.forEach(item => {
        const desc = item.desc || item.description || '';
        resultsHtml += `
            <div class="result" style="margin-bottom: 22px;">
                <div><a href="${item.url}" target="_blank" style="font-size: 16px; font-weight: bold;">${item.title}</a></div>
                <div style="margin: 4px 0; color: #222;">${desc}</div>
                <div class="url" style="color: green; font-size: 12px;">${item.url}</div>
            </div>
        `;
    });

    if (resultsHtml === '') {
        resultsHtml = `<p>[!] No direct matches found in index for "<b>${rawQuery}</b>".</p>`;
    }

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ChickSearch - ${rawQuery}</title>
            <style>
                body { font-family: monospace; max-width: 650px; margin: 40px auto; padding: 0 10px; }
                a { color: #0000ee; text-decoration: underline; }
                a:visited { color: #551a8b; }
            </style>
        </head>
        <body>
            <p><a href="/">&lt;-- Back to Home</a></p>
            <h2>Results for "${rawQuery}"</h2>
            <hr>
            ${calcResultWidget}
            ${resultsHtml}
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ChickSearch engine running on port ${PORT}`);
});

module.exports = app;