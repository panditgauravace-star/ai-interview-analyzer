const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('API Key not found');
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error('Error:', json.error);
            } else {
                console.log('Available Models:');
                json.models.forEach(model => {
                    console.log(model.name);
                });
            }
        } catch (e) {
            console.error('Failed to parse response:', e);
            console.log('Raw response:', data);
        }
    });

}).on('error', (err) => {
    console.error('Request failed:', err);
});
