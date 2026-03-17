import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log('🔄 Fetching available models...');
        // Note: The SDK doesn't expose listModels directly on the main class in all versions, 
        // but let's try to infer or test specific models if listing isn't straightforward.
        // Actually, the SDK v0.21.0 might not have a direct listModels method on the client.
        // Instead, let's test a few common model names to see which one works.

        const modelsToTest = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash-001',
            'gemini-pro',
            'gemini-1.0-pro'
        ];

        for (const modelName of modelsToTest) {
            console.log(`\nTesting model: ${modelName}`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Hello, are you working? Respond with "Yes".');
                const response = await result.response;
                console.log(`✅ ${modelName} is working! Response: ${response.text()}`);
                process.exit(0); // Exit on first success
            } catch (error: any) {
                console.log(`❌ ${modelName} failed: ${error.message.split('\n')[0]}`);
            }
        }

        console.error('\n❌ No working models found.');
        process.exit(1);
    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
