'use server'

import { createClient } from '@supabase/supabase-js'

export async function becomeAdmin(userId: string) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceKey || !url) {
        return { success: false, message: "Clé Service Role manquante dans .env.local" }
    }

    const supabaseAdmin = createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })

    try {
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ is_admin: true })
            .eq('id', userId)

        if (error) {
            console.error(error)
            return { success: false, message: error.message }
        }

        return { success: true, message: "Vous êtes maintenant Admin ! 🎉" }
    } catch (e) {
        return { success: false, message: "Erreur serveur inconnue" }
    }
}
