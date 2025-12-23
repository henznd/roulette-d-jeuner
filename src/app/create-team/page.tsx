'use client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Building2, ArrowRight } from 'lucide-react'

export default function CreateTeamPage() {
    const router = useRouter()
    const [teamName, setTeamName] = useState('')
    const [loading, setLoading] = useState(false)

    const handleCreateTeam = async () => {
        if (!teamName.trim()) {
            toast.error("Le nom de la team est requis")
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

        // Générer code unique
        const code = Math.random().toString(36).substring(2, 10).toUpperCase()

        // Créer la team
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .insert({
                name: teamName,
                code,
                created_by: session.user.id
            })
            .select()
            .single()

        if (teamError) {
            toast.error("Erreur création team")
            setLoading(false)
            return
        }

        // Assigner l'utilisateur à cette team en tant qu'admin
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                team_id: team.id,
                is_team_admin: true
            })
            .eq('id', session.user.id)

        setLoading(false)

        if (profileError) {
            toast.error("Erreur assignation")
        } else {
            toast.success(`Team "${teamName}" créée ! Code: ${code}`)
            router.push('/')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#5D2EE8]/5 to-gray-50 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 p-8 space-y-6">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#5D2EE8]/10 rounded-2xl mb-4">
                            <Building2 className="w-8 h-8 text-[#5D2EE8]" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900">Créer une Team</h1>
                        <p className="text-gray-500 mt-2">
                            Vous serez automatiquement administrateur
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Nom de la team
                            </label>
                            <Input
                                placeholder="Ex: Wavestone, Team Rocket..."
                                value={teamName}
                                onChange={e => setTeamName(e.target.value)}
                                className="border-2 border-gray-300 h-12 text-lg focus:border-[#5D2EE8]"
                                onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                            />
                        </div>

                        <Button
                            onClick={handleCreateTeam}
                            disabled={loading || !teamName.trim()}
                            className="w-full h-14 text-lg font-bold bg-[#5D2EE8] hover:bg-[#4A24B8] text-white rounded-xl shadow-lg"
                        >
                            {loading ? 'Création...' : (
                                <>
                                    Créer la team
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>

                        <div className="text-center pt-4">
                            <button
                                onClick={() => router.push('/join-team')}
                                className="text-sm font-semibold text-[#5D2EE8] hover:underline"
                            >
                                Vous avez déjà un code ? Rejoindre une team
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
