const fs = require('fs');
const path = require('path');

const campaignPath = path.join(__dirname, '../data/campaigns.json');

console.log('☢️ NUCLEAR RESET (Direct Filesystem)...');

if (fs.existsSync(campaignPath)) {
    const data = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
    const updated = data.map(c => {
        console.log(`- Setting ${c.id} to paused`);
        return { ...c, status: 'paused' };
    });
    fs.writeFileSync(campaignPath, JSON.stringify(updated, null, 2));
    console.log('✅ All campaigns PAUSED in data/campaigns.json');
} else {
    console.log('❌ data/campaigns.json not found.');
}
console.log('☢️ RESET COMPLETE. Kill your "npm run dev" terminal and restart it!');
