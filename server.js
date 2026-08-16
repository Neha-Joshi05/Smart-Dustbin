const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 3000;

// Serve static files from simulator folder
app.use(express.static(path.join(__dirname, 'simulator')));

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'simulator', 'index.html')
    );
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║   🗑️  SMART DUSTBIN SERVER RUNNING!      ║
║   Port   : ${PORT}                           ║
║   Status : Online                        ║
╚══════════════════════════════════════════╝
    `);
});