const fs = require('fs');
const path = require('path');

const seedQuestionsPath = path.join(__dirname, '../src/seed-questions.ts');

if (!fs.existsSync(seedQuestionsPath)) {
    console.error(`Error: Could not find file at ${seedQuestionsPath}`);
    process.exit(1);
}

const content = fs.readFileSync(seedQuestionsPath, 'utf8');
const lines = content.split('\n');

const roles = [
    'frontend-developer',
    'backend-developer',
    'fullstack-developer',
    'software-developer',
    'devops-engineer',
    'hr-manager',
    'chartered-accountant',
    'business-analyst',
    'cybersecurity-analyst',
    'product-manager',
    'uiux-designer',
    'data-scientist'
];

let currentRole = null;
const counts = {};
roles.forEach(r => counts[r] = 0);

for (const line of lines) {
    // Check for start of a role array
    // Matches: 'role-name': [
    const roleMatch = line.match(/^\s*'([\w-]+)':\s*\[/);
    if (roleMatch) {
        const role = roleMatch[1];
        if (roles.includes(role)) {
            currentRole = role;
        }
    }

    // Check for end of a role array
    if (line.trim() === '],') {
        currentRole = null;
    }

    // Count questions if inside a role
    if (currentRole && line.includes('{ content:')) {
        counts[currentRole]++;
    }
}

console.log("--- MCQ Counts per Role ---");
for (const [role, count] of Object.entries(counts)) {
    console.log(`${role}: ${count}`);
}
