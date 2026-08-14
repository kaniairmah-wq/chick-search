const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const startTime = Date.now();

// Membaca file database.json dari Drive D
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
        <head><title>System Diagnostics</title></head>
        <body style="background: #3b6ea5; padding: 30px; font-family: Arial, sans-serif;">
            <div style="background: #c0c0c0; border: 2px outset #fff; width: 420px; margin: 0 auto; padding: 4px;">
                <div style="background: #000080; color: white; padding: 4px; font-weight: bold;">🖥️ System Status</div>
                <div style="padding: 15px; font-family: 'Courier New', monospace; font-size: 13px;">
                    <p>STATUS: ONLINE</p>
                    <p>STORAGE LOCATION: D:\\Chick\\database.json</p>
                    <p>INDEXED DATABASE: ${db.length} Websites</p>
                    <p>ENGINE UPTIME: ${uptime} seconds</p>
                    <p>MEMORY USAGE: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB</p>
                    <br>
                    <a href="/" style="background: #c0c0c0; border: 2px outset #fff; padding: 4px 10px; color: black; text-decoration: none; font-weight: bold;">[OK]</a>
                </div>
            </div>
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
            calcResultWidget = `
                <div style="background: #d4d0c8; border: 2px outset #fff; padding: 10px; margin-bottom: 15px; font-family: 'Courier New', monospace;">
                    <div style="background: #008080; color: white; padding: 3px 6px; font-weight: bold;">🧮 QUICK CALCULATOR RESULT</div>
                    <p style="font-size: 16px; font-weight: bold; margin: 10px 0 0 0;">${rawQuery} = ${evalResult}</p>
                </div>
            `;
        } catch (e) {}
    }

    // Filter dari Database Lokal
    const LOCAL_DATABASE = getLocalDatabase();
    const localResults = LOCAL_DATABASE.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.desc.toLowerCase().includes(query) ||
        item.url.toLowerCase().includes(query)
    );

    let resultsHtml = '';
    localResults.forEach(item => {
        resultsHtml += `
            <div style="background: #c0c0c0; border: 2px outset #fff; padding: 10px; margin-bottom: 12px; text-align: left;">
                <div style="background: #000080; color: white; padding: 3px 8px; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;">
                    [DOCUMENT] ${item.title}
                </div>
                <div style="padding: 8px; font-family: 'Courier New', monospace; font-size: 13px; color: #000;">
                    <p style="margin: 0 0 8px 0;">${item.desc}</p>
                    <a href="${item.url}" target="_blank" style="color: #0000ff; font-weight: bold;">GOTO: ${item.url}</a>
                </div>
            </div>
        `;
    });

    if (resultsHtml === '') {
        resultsHtml = `<p style="font-family: 'Courier New', monospace; padding: 10px;">[!] NO DIRECT MATCHES FOUND IN INDEX FOR "${rawQuery}".</p>`;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>ChickSearch: ${rawQuery}</title>
        </head>
        <body style="background: #3b6ea5; margin: 0; padding: 20px; font-family: Arial, sans-serif;">
            <div style="background: #c0c0c0; border: 2px outset #fff; max-width: 750px; margin: 0 auto; padding: 15px;">
                <h2 style="margin-top: 0; color: #000; border-bottom: 2px solid #808080; padding-bottom: 5px; font-family: 'Courier New', monospace;">QUERY: "${rawQuery.toUpperCase()}"</h2>
                
                <div style="margin-bottom: 15px; font-family: 'Courier New', monospace; font-size: 13px;">
                    <a href="/" style="color: #000; font-weight: bold;">[&lt;- HOME]</a> | 
                    <a href="/surprise" style="color: #0000ff; font-weight: bold;">[SURPRISE ME 🎲]</a> | 
                    <a href="/status" style="color: #008000; font-weight: bold;">[SYSTEM STATUS 🖥️]</a>
                </div>

                ${calcResultWidget}

                <h3 style="font-family: 'Courier New', monospace; color: #000080; margin-top: 15px;">--- SEARCH INDEX RESULTS (${localResults.length}) ---</h3>
                ${resultsHtml}
            </div>
        </body>
        </html>
    `);
});

app.listen(3000, () => {
    console.log('ChickSearch Sandbox engine running at http://localhost:3000');
});