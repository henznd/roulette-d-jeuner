'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Users, ArrowRight } from 'lucide-react'

export default function JoinTeamPage() {
    const router = useRouter()
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)

    const handleJoinTeam = async () => {
        if (!code.trim() || code.length !== 8) {
            toast.error("Le code doit faire 8 caractères")
            return
        }

        setLoading(true)

        // Vérifier session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            toast.error("Vous devez être connecté")
            router.push('/')
            return
        }

        // Rechercher la team par code
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('*')
            .eq('code', code.toUpperCase())
            .single()

        if (teamError || !team) {
            toast.error("Code invalide")
            setLoading(false)
            return
        }

        // Assigner l'utilisateur à cette team
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                team_id: team.id,
                is_team_admin: false  // Membre normal
            })
            .eq('id', session.user.id)

        setLoading(false)

        if (profileError) {
            toast.error("Erreur d'assignation")
        } else {
            toast.success(`Bienvenue dans la team "${team.name}" ! 🎉`)
            router.push('/')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#5D2EE8]/5 to-gray-50 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 p-8 space-y-6">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#5D2EE8]/10 rounded-2xl mb-4">
                            <Users className="w-8 h-8 text-[#5D2EE8]" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900">Rejoindre une Team</h1>
                        <p className="text-gray-500 mt-2">
                            Entrez le code à 8 caractères
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Code de la team
                            </label>
                            <Input
                                placeholder="ABC12345"
                                value={code}
                                onChange={e => setCode(e.target.value.toUpperCase())}
                                maxLength={8}
                                className="border-2 border-gray-300 h-14 text-2xl font-mono text-center tracking-widest focus:border-[#5D2EE8]"
                                onKeyDown={e => e.key === 'Enter' && handleJoinTeam()}
                            />
                            <p className="text-xs text-gray-400 mt-2 text-center">
                                Le code est fourni par l'administrateur de la team
                            </p>
                        </div>

                        <Button
                            onClick={handleJoinTeam}
                            disabled={loading || code.length !== 8}
                            className="w-full h-14 text-lg font-bold bg-[#5D2EE8] hover:bg-[#4A24B8] text-white rounded-xl shadow-lg"
                        >
                            {loading ? 'Connexion...' : (
                                <>
                                    Rejoindre
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>

                        <div className="text-center pt-4">
                            <button
                                onClick={() => router.push('/create-team')}
                                className="text-sm font-semibold text-[#5D2EE8] hover:underline"
                            >
                                Vous n'avez pas de code ? Créer votre team
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
