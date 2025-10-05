// Import the main app from app.js
const app = require('./Src/app');

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Local URL: http://localhost:${PORT}`);
});
