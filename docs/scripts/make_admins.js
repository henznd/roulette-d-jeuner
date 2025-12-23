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

async function makeEveryoneAdmin() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !url) {
        console.error("❌ ERREUR: Clé SUPABASE_SERVICE_ROLE_KEY manquante !");
        return;
    }

    const supabase = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log("🔄 Récupération des utilisateurs Auth...");

    // 1. Get ALL users from Auth (requires Service Role)
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError || !users) {
        console.error("❌ Erreur lecture utilisateurs:", authError?.message);
        return;
    }

    console.log(`👤 ${users.length} utilisateurs trouvés dans l'Auth.`);

    if (users.length === 0) {
        console.log("⚠️ Bizarre : Aucun utilisateur trouvé.");
        return;
    }

    let successCount = 0;

    for (const user of users) {
        // 2. Upsert profile for EACH user to ensure row exists
        const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                is_admin: true,
                username: user.email?.split('@')[0] || 'User',
                weekly_veto_used: false // default
            }, { onConflict: 'id' });

        if (upsertError) {
            console.error(`❌ Echec pour ${user.email}:`, upsertError.message);
        } else {
            console.log(`✅ Admin appliqué pour: ${user.email}`);
            successCount++;
        }
    }

    console.log(`\n🎉 TERMINÉ: ${successCount}/${users.length} profils mis à jour.`);
    console.log("👉 Rafraîchissez votre page Web MAINTENANT !");
}

makeEveryoneAdmin();
