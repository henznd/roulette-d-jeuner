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

async function initializeWavestoneTeam() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabase = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log("🚀 Initialisation Team Wavestone...\n");

    // 1. Créer team Wavestone
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
            name: 'Wavestone',
            code: 'WAVE2024',  // Code fixe pour la team principale
            created_by: null  // Peut être null si pas de créateur spécifique
        })
        .select()
        .single();

    if (teamError) {
        if (teamError.code === '23505') {  // Unique constraint violation
            console.log("ℹ️  Team Wavestone existe déjà");
            const { data: existingTeam } = await supabase
                .from('teams')
                .select('*')
                .eq('code', 'WAVE2024')
                .single();

            if (!existingTeam) {
                console.error("❌ Erreur récupération team existante");
                return;
            }

            console.log(`✅ Team trouvée: ${existingTeam.name} (ID: ${existingTeam.id})`);
            await assignUsersToTeam(supabase, existingTeam.id);
        } else {
            console.error("❌ Erreur création team:", teamError);
            return;
        }
    } else {
        console.log(`✅ Team Wavestone créée !`);
        console.log(`   Code: ${team.code}`);
        console.log(`   ID: ${team.id}\n`);
        await assignUsersToTeam(supabase, team.id);
    }
}

async function assignUsersToTeam(supabase, teamId) {
    console.log("👥 Assignation des utilisateurs...\n");

    // Récupérer tous les users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError || !users) {
        console.error("❌ Erreur récupération users:", authError?.message);
        return;
    }

    console.log(`📋 ${users.length} utilisateur(s) trouvé(s)\n`);

    for (const user of users) {
        // Générer username si pas déjà présent
        const defaultUsername = user.email?.split('@')[0] || `user_${user.id.substring(0, 8)}`;

        // Vérifier si profil existe
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (existingProfile) {
            // Mettre à jour profil existant
            const { error } = await supabase
                .from('profiles')
                .update({
                    team_id: teamId,
                    username: existingProfile.username || defaultUsername,
                    is_team_admin: user.email === 'fousouley2002@gmail.com',  // Admin principal
                    double_vote_available: true
                })
                .eq('id', user.id);

            if (error) {
                console.error(`❌ ${user.email}: ${error.message}`);
            } else {
                const role = user.email === 'fousouley2002@gmail.com' ? '👑 ADMIN' : '👤 Member';
                console.log(`${role} ${user.email} → @${existingProfile.username || defaultUsername}`);
            }
        } else {
            // Créer nouveau profil
            const { error } = await supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    username: defaultUsername,
                    team_id: teamId,
                    is_team_admin: user.email === 'fousouley2002@gmail.com',
                    double_vote_available: true,
                    last_banishment_date: null
                });

            if (error) {
                console.error(`❌ ${user.email}: ${error.message}`);
            } else {
                const role = user.email === 'fousouley2002@gmail.com' ? '👑 ADMIN' : '👤 Member';
                console.log(`${role} ${user.email} → @${defaultUsername} (nouveau profil)`);
            }
        }
    }

    // Assigner tous les restaurants existants à la team Wavestone
    console.log("\n🍽️  Assignation des restaurants...");
    const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, name')
        .is('team_id', null);

    if (restaurants && restaurants.length > 0) {
        const { error } = await supabase
            .from('restaurants')
            .update({ team_id: teamId })
            .is('team_id', null);

        if (error) {
            console.error("❌ Erreur assignation restaurants");
        } else {
            console.log(`✅ ${restaurants.length} restaurant(s) assigné(s) à Wavestone`);
        }
    }

    console.log("\n✅ MIGRATION TERMINÉE !\n");
    console.log("📝 Prochaines étapes :");
    console.log("   1. Exécutez migration_v2.sql dans Supabase");
    console.log("   2. Les users devront choisir un pseudo au prochain login");
    console.log("   3. Accès admin: /admin");
}

initializeWavestoneTeam();
