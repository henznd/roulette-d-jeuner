'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function AuthForm() {
    const [isSignUp, setIsSignUp] = useState(false)
    const [isForgotPassword, setIsForgotPassword] = useState(false)
    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loginIdentifier, setLoginIdentifier] = useState('') // Email OU Username
    const [loading, setLoading] = useState(false)

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        if (isForgotPassword) {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback`,
            })
            if (error) {
                toast.error("Erreur: " + error.message)
            } else {
                toast.success("Email de réinitialisation envoyé ! 📧")
                setIsForgotPassword(false)
            }
        } else if (isSignUp) {
            if (!username.trim()) {
                toast.error("Le pseudo est obligatoire")
                setLoading(false)
                return
            }

            // Vérifier unicité du username
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username.trim())
                .single()

            if (existingUser) {
                toast.error("Ce pseudo est déjà pris 😕")
                setLoading(false)
                return
            }

            const { data, error } = await supabase.auth.signUp({ email, password })

            if (error) {
                toast.error("Erreur: " + error.message)
            } else if (data.user) {
                // Créer le profil avec username
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: data.user.id,
                        username: username.trim(),
                        double_vote_available: true
                    })

                if (profileError) {
                    console.error("Profile creation error:", profileError)
                }

                toast.success("Compte créé ! Vérifie tes emails 📧")
                // Laisser l'utilisateur confirmer son email
                // Après confirmation, la page principale redirigera vers create-team si pas de team
            }
        } else {
            // Login : email OU username
            let emailToUse = loginIdentifier

            // Si pas un email, chercher par username
            if (!loginIdentifier.includes('@')) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', loginIdentifier)
                    .single()

                if (profile) {
                    // Récupérer l'email via auth.users (admin API needed)
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) emailToUse = user.email || loginIdentifier
                } else {
                    toast.error("Utilisateur introuvable")
                    setLoading(false)
                    return
                }
            }

            const { error } = await supabase.auth.signInWithPassword({
                email: emailToUse,
                password
            })

            if (error) {
                toast.error("Identifiants incorrects")
            } else {
                toast.success("Connecté ! 🎉")
            }
        }

        setLoading(false)
    }

    return (
        <div className="w-full max-w-md space-y-6 bg-white/10 backdrop-blur-xl p-8 rounded-3xl border-2 border-white/30 shadow-2xl">
            {/* Header */}
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-white drop-shadow-lg">
                    {isForgotPassword ? 'Mot de passe oublié ?' : isSignUp ? 'Créer un compte' : 'Connexion'}
                </h2>
                <p className="text-white/80 text-sm">
                    {isForgotPassword
                        ? 'Entrez votre email pour réinitialiser'
                        : isSignUp
                            ? 'Rejoignez LunchSquad !'
                            : 'Bon retour parmi nous 👋'
                    }
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-4">
                {isForgotPassword ? (
                    <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white placeholder:text-white/60 focus:border-white/60 rounded-xl"
                    />
                ) : isSignUp ? (
                    <>
                        <Input
                            type="text"
                            placeholder="Pseudo (unique)"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="h-12 bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white placeholder:text-white/60 focus:border-white/60 rounded-xl"
                        />
                        <Input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-12 bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white placeholder:text-white/60 focus:border-white/60 rounded-xl"
                        />
                        <Input
                            type="password"
                            placeholder="Mot de passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="h-12 bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white placeholder:text-white/60 focus:border-white/60 rounded-xl"
                        />
                    </>
                ) : (
                    <>
                        <Input
                            type="text"
                            placeholder="Email ou Pseudo"
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            required
                            className="h-12 bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white placeholder:text-white/60 focus:border-white/60 rounded-xl"
                        />
                        <Input
                            type="password"
                            placeholder="Mot de passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="h-12 bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white placeholder:text-white/60 focus:border-white/60 rounded-xl"
                        />
                    </>
                )}

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-gradient-to-r from-white to-yellow-200 hover:from-yellow-100 hover:to-white text-[#5D2EE8] font-black text-lg rounded-xl shadow-xl transform hover:scale-105 transition-all"
                >
                    {loading ? '⏳ Chargement...' : isForgotPassword ? '📧 Envoyer' : isSignUp ? '🚀 S\'inscrire' : '🔓 Se connecter'}
                </Button>
            </form>

            {/* Footer Links */}
            <div className="space-y-3 text-center">
                {!isForgotPassword && (
                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-white/90 hover:text-white underline text-sm font-semibold transition-colors"
                    >
                        {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S\'inscrire'}
                    </button>
                )}

                {!isSignUp && (
                    <button
                        type="button"
                        onClick={() => setIsForgotPassword(!isForgotPassword)}
                        className="block mx-auto text-white/70 hover:text-white text-xs transition-colors"
                    >
                        {isForgotPassword ? '← Retour' : 'Mot de passe oublié ?'}
                    </button>
                )}
            </div>
        </div>
    )
}
