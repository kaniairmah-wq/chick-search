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
// Halaman Settings (SafeSearch + Lite Mode)
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
                    <b>SafeSearch</b>: Filter / Censor adult & unsafe content
                </label>
                <br><br>
                <label style="cursor: pointer;">
                    <input type="checkbox" id="liteSearchCheck" onchange="saveSetting()"> 
                    <b>Lite Search Mode</b>: Exclude bloated/heavy dynamic pages (pure text/retro only)
                </label>
                <br><br>
                <small style="color: #666;">Preferences are saved locally in your browser.</small>
            </div>

            <script>
                // Load saved preferences
                document.getElementById('safeSearchCheck').checked = localStorage.getItem('chick_safesearch') !== 'false';
                document.getElementById('liteSearchCheck').checked = localStorage.getItem('chick_litesearch') === 'true';

                function saveSetting() {
                    const safe = document.getElementById('safeSearchCheck').checked;
                    const lite = document.getElementById('liteSearchCheck').checked;
                    localStorage.setItem('chick_safesearch', safe);
                    localStorage.setItem('chick_litesearch', lite);
                }
            </script>
        </body>
        </html>
    `);
});

// Halaman Settings (SafeSearch + Lite Mode)
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
                <label style="cursor: pointer; display: block; margin-bottom: 10px;">
                    <input type="checkbox" id="liteSearchCheck" onchange="saveSetting()"> 
                    <b>Lite Search Mode</b>: Exclude bloated/heavy dynamic pages (pure HTML/retro only)
                </label>
                <hr style="border: 0; border-top: 1px dashed #ccc; margin: 12px 0;">
                <small style="color: #666;">Preferences are saved locally in your browser storage.</small>
            </div>

            <script>
                document.getElementById('safeSearchCheck').checked = localStorage.getItem('chick_safesearch') !== 'false';
                document.getElementById('liteSearchCheck').checked = localStorage.getItem('chick_litesearch') === 'true';

                function saveSetting() {
                    const safe = document.getElementById('safeSearchCheck').checked;
                    const lite = document.getElementById('liteSearchCheck').checked;
                    localStorage.setItem('chick_safesearch', safe);
                    localStorage.setItem('chick_litesearch', lite);
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