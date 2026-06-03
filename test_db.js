const fs = require('fs');

const content = fs.readFileSync('seed_part1.sql', 'utf-8');
const lines = content.split('\n');

const ids = new Set();
const emails = new Set();

console.log('Validating seed_part1.sql entries...');
lines.forEach((line, idx) => {
  if (line.includes('INSERT INTO auth.users')) {
    // Extract ID and Email
    const idMatch = line.match(/'(d1000000-[^']+)'/);
    const emailMatch = line.match(/'([^']+@src\.com)'/);
    
    if (idMatch) {
      const id = idMatch[1];
      if (ids.has(id)) {
        console.log(`Line ${idx + 1}: Duplicate User ID found: ${id}`);
      }
      ids.add(id);
    }
    
    if (emailMatch) {
      const email = emailMatch[1];
      if (emails.has(email)) {
        console.log(`Line ${idx + 1}: Duplicate Email found: ${email}`);
      }
      emails.add(email);
    }
  }
});
console.log('Validation complete.');
