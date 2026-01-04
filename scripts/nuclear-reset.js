const { readData, writeData } = require('../lib/storage');

async function nuclearReset() {
    console.log('☢️ NUCLEAR RESET INITIATED...');
    
    // 1. Clear global keys in memory (if we could, but this script is a separate process)
    // We can't clear the global object of the Next.js process from here.
    
    // 2. Set all campaigns to paused so the loop terminates on next iteration
    try {
        const campaigns = await readData('campaigns');
        for (let c of campaigns) {
            c.status = 'paused';
            console.log(`- Campaign ${c.id} set to PAUSED`);
        }
        await writeData('campaigns', campaigns);
        console.log('✅ All campaigns PAUSED in database.');
    } catch (e) {
        console.error('Failed to pause campaigns:', e);
    }
    
    console.log('☢️ RESET COMPLETE. Please RESTART your "npm run dev" terminal now.');
}

nuclearReset();
