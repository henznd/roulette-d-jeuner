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

async function restrictAdmin() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabase = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const ADMIN_EMAIL = 'fousouley2002@gmail.com';

    console.log(`🔒 Restriction Admin à: ${ADMIN_EMAIL}`);

    // 1. Get all users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError || !users) {
        console.error("❌ Erreur:", authError?.message);
        return;
    }

    console.log(`👤 ${users.length} utilisateur(s) trouvé(s)\n`);

    for (const user of users) {
        const isAdminUser = user.email === ADMIN_EMAIL;

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                is_admin: isAdminUser,
                username: user.email?.split('@')[0] || 'User',
                weekly_veto_used: false
            }, { onConflict: 'id' });

        if (error) {
            console.error(`❌ Echec pour ${user.email}:`, error.message);
        } else {
            const status = isAdminUser ? '👑 ADMIN' : '👤 USER';
            console.log(`${status} → ${user.email}`);
        }
    }

    console.log(`\n✅ TERMINÉ: Seul ${ADMIN_EMAIL} est Admin.`);
}

restrictAdmin();
