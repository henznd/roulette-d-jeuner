const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
try {
    const envConfig = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) process.env[key.trim()] = val.trim();
    });
} catch (e) { console.log("⚠️ Could not read .env.local"); }

async function verifyStatus() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabase = createClient(url, serviceKey);

    // List all profiles
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) console.error(error);
    else {
        console.log("📊 ÉTAT ACTUEL DE LA DB (PROFILES):");
        console.table(profiles);
    }
}
verifyStatus();
