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

async function prepareForMigration() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabase = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log("🧹 NETTOYAGE PRÉ-MIGRATION...\n");

    // 1. Supprimer tous les votes
    const { error: votesError } = await supabase.from('votes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (votesError) console.error("❌ Erreur votes:", votesError.message);
    else console.log("✅ Votes supprimés");

    // 2. Supprimer tous les vetos
    const { error: vetosError } = await supabase.from('vetos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (vetosError) console.error("❌ Erreur vetos:", vetosError.message);
    else console.log("✅ Vetos supprimés");

    // 3. Supprimer tous les restaurants
    const { error: restosError } = await supabase.from('restaurants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (restosError) console.error("❌ Erreur restaurants:", restosError.message);
    else console.log("✅ Restaurants supprimés");

    console.log("\n✅ NETTOYAGE TERMINÉ !");
    console.log("\n📋 PROCHAINE ÉTAPE:");
    console.log("   Copiez le contenu de 'migration_banishment_structure.sql'");
    console.log("   et exécutez-le dans le SQL Editor de Supabase.");
}

prepareForMigration();
