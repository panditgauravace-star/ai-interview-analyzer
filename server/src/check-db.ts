
import mongoose from 'mongoose';
import { config } from './config/index.js';
import { Question } from './models/Question.js';

async function check() {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('✅ Connected to MongoDB');

        const roles = [
            'software-developer', 'frontend-developer', 'backend-developer', 'fullstack-developer',
            'data-scientist', 'devops-engineer', 'cybersecurity-analyst'
        ];

        for (const role of roles) {
            const coding = await Question.find({ role, type: 'coding' });
            console.log(`\nRole: ${role}, Coding Questions: ${coding.length}`);

            let easy = 0, medium = 0, hard = 0;
            let invalid = 0;

            for (const q of coding) {
                if (q.difficulty === 'easy') easy++;
                else if (q.difficulty === 'medium') medium++;
                else if (q.difficulty === 'hard') hard++;

                try {
                    JSON.parse(q.content);
                } catch (e) {
                    console.error(`❌ Invalid JSON for question ${q._id}:`, e.message);
                    console.error('Content:', q.content);
                    invalid++;
                }
            }
            console.log(`   E: ${easy}, M: ${medium}, H: ${hard}`);
            if (invalid > 0) console.log(`   ❌ FOUND ${invalid} INVALID QUESTIONS`);

            const caseStudies = await Question.find({ role, type: 'case-study' });
            console.log(`   Case Studies: ${caseStudies.length}`);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
}

check();
