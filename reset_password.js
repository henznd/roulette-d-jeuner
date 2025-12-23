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

async function resetPassword() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabase = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const email = 'fousouley2002@gmail.com';
    const newPassword = 'Admin123!'; // Mot de passe temporaire simple

    console.log(`🔄 Réinitialisation du mot de passe pour: ${email}`);

    const { data, error } = await supabase.auth.admin.updateUserById(
        '79d75d67-a0f1-4682-8028-b5a5739c95d3', // ID from verify_db.js
        { password: newPassword }
    );

    if (error) {
        console.error('❌ Erreur:', error.message);
    } else {
        console.log('✅ SUCCÈS !');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Nouveau mot de passe: ${newPassword}`);
        console.log('\n👉 Utilisez ces identifiants pour vous connecter.');
    }
}

resetPassword();
