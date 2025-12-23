'use client'

// Force dynamic rendering (needed for Supabase auth)
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
    Users,
    Building2,
    Utensils,
    Settings as SettingsIcon,
    Plus,
    Trash2,
    Edit,
    Shield,
    ShieldOff,
    LogOut,
    BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Team = {
    id: string
    name: string
    code: string
    created_at: string
    created_by: string
}

type User = {
    id: string
    email: string
    username: string
    is_team_admin: boolean
    team_id: string
    double_vote_available: boolean
}

type Restaurant = {
    id: string
    name: string
    cuisine_type: string | null
    google_maps_link: string | null
    rating: number
    rating_count: number
}

export default function AdminDashboard() {
    const router = useRouter()
    const [session, setSession] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'users' | 'restaurants' | 'settings'>('overview')

    // Data
    const [teams, setTeams] = useState<Team[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [restaurants, setRestaurants] = useState<Restaurant[]>([])
    const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
    const [currentSettings, setCurrentSettings] = useState<any>(null)

    // Forms
    const [newTeamName, setNewTeamName] = useState('')
    const [editingTeam, setEditingTeam] = useState<string | null>(null)

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        const { data: { session: currentSession } } = await supabase.auth.getSession()

        if (!currentSession) {
            router.push('/')
            return
        }

        // Vérifier si admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_team_admin, team_id')
            .eq('id', currentSession.user.id)
            .single()

        if (!profile?.is_team_admin) {
            toast.error("Accès refusé - Admin uniquement")
            router.push('/')
            return
        }

        setSession(currentSession)
        fetchData(profile.team_id)
        setLoading(false)
    }

    const fetchData = async (teamId: string) => {
        // Fetch teams
        const { data: teamsData } = await supabase
            .from('teams')
            .select('*')
            .order('created_at', { ascending: false })
        if (teamsData) setTeams(teamsData)

        // Fetch current team
        const { data: teamData } = await supabase
            .from('teams')
            .select('*')
            .eq('id', teamId)
            .single()
        if (teamData) setCurrentTeam(teamData)

        // Fetch users of current team
        const { data: usersData } = await supabase
            .from('profiles')
            .select('*')
            .eq('team_id', teamId)
            .order('created_at', { ascending: false })
        if (usersData) setUsers(usersData)

        // Fetch restaurants of current team
        const { data: restosData } = await supabase
            .from('restaurants')
            .select('*')
            .eq('team_id', teamId)
            .order('name')
        if (restosData) setRestaurants(restosData)

        // Fetch settings for current team
        const { data: settingsData } = await supabase
            .from('app_settings')
            .select('*')
            .eq('team_id', teamId)
            .single()

        if (settingsData) {
            setCurrentSettings(settingsData)
        } else {
            // Créer settings par défaut pour cette team
            const { data: newSettings } = await supabase
                .from('app_settings')
                .insert({
                    team_id: teamId,
                    closing_hour: 12,
                    active_days: [1, 2, 3, 4, 5]
                })
                .select()
                .single()
            if (newSettings) setCurrentSettings(newSettings)
        }
    }

    const createTeam = async () => {
        if (!newTeamName.trim()) {
            toast.error("Le nom de la team est requis")
            return
        }

        // Générer code unique (côté client pour démo, mieux vaut côté serveur)
        const code = Math.random().toString(36).substring(2, 10).toUpperCase()

        const { data, error } = await supabase
            .from('teams')
            .insert({
                name: newTeamName,
                code,
                created_by: session.user.id
            })
            .select()
            .single()

        if (error) {
            toast.error("Erreur création team")
        } else {
            toast.success(`Team "${newTeamName}" créée ! Code: ${code}`)
            setNewTeamName('')
            fetchData(currentTeam?.id || '')
        }
    }

    const updateTeamName = async (teamId: string, newName: string) => {
        const { error } = await supabase
            .from('teams')
            .update({ name: newName })
            .eq('id', teamId)

        if (error) {
            toast.error("Erreur mise à jour")
        } else {
            toast.success("Team renommée")
            setEditingTeam(null)
            fetchData(currentTeam?.id || '')
        }
    }

    const deleteTeam = async (teamId: string, teamName: string) => {
        if (!confirm(`Supprimer la team "${teamName}" ? Cette action est irréversible.`)) return

        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', teamId)

        if (error) {
            toast.error("Erreur suppression")
        } else {
            toast.success("Team supprimée")
            fetchData(currentTeam?.id || '')
        }
    }

    const toggleUserAdmin = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_team_admin: !currentStatus })
            .eq('id', userId)

        if (error) {
            toast.error("Erreur")
        } else {
            toast.success(currentStatus ? "Admin révoqué" : "Promu admin")
            fetchData(currentTeam?.id || '')
        }
    }

    const resetAllDoubleVotes = async () => {
        if (!confirm("Réinitialiser les double votes pour TOUS les membres de la team ?")) return

        const { error } = await supabase
            .from('profiles')
            .update({ double_vote_available: true })
            .eq('team_id', currentTeam?.id)

        if (error) {
            toast.error("Erreur réinitialisation")
        } else {
            toast.success("✅ Tous les double votes réinitialisés !")
            fetchData(currentTeam?.id || '')
        }
    }

    const resetAllBanishments = async () => {
        if (!confirm("Réinitialiser les banissements pour TOUS les membres ?")) return

        const { error } = await supabase
            .from('profiles')
            .update({ last_banishment_date: null })
            .eq('team_id', currentTeam?.id)

        if (error) {
            toast.error("Erreur réinitialisation")
        } else {
            toast.success("✅ Tous les banissements réinitialisés !")
            fetchData(currentTeam?.id || '')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-2xl font-bold text-gray-400">Chargement...</p>
            </div>
        )
    }

    const tabs = [
        { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
        { id: 'teams', label: 'Teams', icon: Building2 },
        { id: 'users', label: 'Utilisateurs', icon: Users },
        { id: 'restaurants', label: 'Restaurants', icon: Utensils },
        { id: 'settings', label: 'Paramètres', icon: SettingsIcon },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Team: <span className="font-semibold text-[#5D2EE8]">{currentTeam?.name}</span> •
                                Code: <span className="font-mono font-bold">{currentTeam?.code}</span>
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => router.push('/')}
                                className="border-2 border-gray-300"
                            >
                                Retour à l'app
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => supabase.auth.signOut()}
                                className="border-2 border-red-300 text-red-600 hover:bg-red-50"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Déconnexion
                            </Button>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <nav className="flex gap-2 mt-6">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${activeTab === tab.id
                                    ? 'bg-[#5D2EE8] text-white shadow-lg'
                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-6 py-8">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-2 border-gray-200 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Users className="w-5 h-5 text-[#5D2EE8]" />
                                    Utilisateurs
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-black text-gray-900">{users.length}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {users.filter(u => u.is_team_admin).length} admin(s)
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-2 border-gray-200 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Utensils className="w-5 h-5 text-[#5D2EE8]" />
                                    Restaurants
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-black text-gray-900">{restaurants.length}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {restaurants.filter(r => r.rating > 0).length} noté(s)
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-2 border-gray-200 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Building2 className="w-5 h-5 text-[#5D2EE8]" />
                                    Teams Totales
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-black text-gray-900">{teams.length}</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'teams' && (
                    <div className="space-y-6">
                        {/* Create Team */}
                        <Card className="border-2 border-[#5D2EE8]/20 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-[#5D2EE8]" />
                                    Créer une nouvelle team
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-3">
                                    <Input
                                        placeholder="Nom de la team"
                                        value={newTeamName}
                                        onChange={e => setNewTeamName(e.target.value)}
                                        className="border-2 border-gray-300"
                                    />
                                    <Button
                                        onClick={createTeam}
                                        className="bg-[#5D2EE8] hover:bg-[#4A24B8] text-white"
                                    >
                                        Créer
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Teams List */}
                        <div className="space-y-3">
                            {teams.map(team => (
                                <Card key={team.id} className="border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                {editingTeam === team.id ? (
                                                    <div className="flex gap-2">
                                                        <Input
                                                            defaultValue={team.name}
                                                            onBlur={(e) => updateTeamName(team.id, e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    updateTeamName(team.id, e.currentTarget.value)
                                                                }
                                                            }}
                                                            className="border-2 border-[#5D2EE8]"
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <h3 className="text-xl font-bold text-gray-900">{team.name}</h3>
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            Code: <span className="font-mono font-bold text-[#5D2EE8]">{team.code}</span>
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setEditingTeam(editingTeam === team.id ? null : team.id)}
                                                    className="border-2 border-gray-300"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => deleteTeam(team.id, team.name)}
                                                    className="border-2 border-red-300 text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-4">
                        {users.map(user => (
                            <Card key={user.id} className="border-2 border-gray-200 shadow-md">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                {user.username || 'Sans pseudo'}
                                                {user.is_team_admin && (
                                                    <span className="text-xs bg-[#5D2EE8] text-white px-2 py-1 rounded-full font-bold">
                                                        ADMIN
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Double vote: {user.double_vote_available ? '✅ Disponible' : '❌ Utilisé'}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => toggleUserAdmin(user.id, user.is_team_admin)}
                                            className={`border-2 ${user.is_team_admin
                                                ? 'border-red-300 text-red-600 hover:bg-red-50'
                                                : 'border-[#5D2EE8]/30 text-[#5D2EE8] hover:bg-[#5D2EE8]/10'
                                                }`}
                                        >
                                            {user.is_team_admin ? (
                                                <>
                                                    <ShieldOff className="w-4 h-4 mr-2" />
                                                    Révoquer Admin
                                                </>
                                            ) : (
                                                <>
                                                    <Shield className="w-4 h-4 mr-2" />
                                                    Promouvoir Admin
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {activeTab === 'restaurants' && (
                    <div className="space-y-6">
                        {/* Add Restaurant Form */}
                        <Card className="border-2 border-[#5D2EE8]/20 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-[#5D2EE8]" />
                                    Ajouter un restaurant
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <Input
                                        placeholder="Nom"
                                        id="resto-name"
                                        className="border-2 border-gray-300"
                                    />
                                    <Input
                                        placeholder="Type de cuisine"
                                        id="resto-cuisine"
                                        className="border-2 border-gray-300"
                                    />
                                    <Input
                                        placeholder="Lien Google Maps"
                                        id="resto-link"
                                        className="border-2 border-gray-300"
                                    />
                                </div>
                                <Button
                                    onClick={async () => {
                                        const name = (document.getElementById('resto-name') as HTMLInputElement).value
                                        const cuisine = (document.getElementById('resto-cuisine') as HTMLInputElement).value
                                        const link = (document.getElementById('resto-link') as HTMLInputElement).value

                                        if (!name) {
                                            toast.error("Le nom est requis")
                                            return
                                        }

                                        const { error } = await supabase.from('restaurants').insert({
                                            name,
                                            cuisine_type: cuisine || null,
                                            google_maps_link: link || null,
                                            team_id: currentTeam?.id,
                                            added_by: session.user.id
                                        })

                                        if (error) {
                                            toast.error("Erreur ajout")
                                        } else {
                                            toast.success(`${name} ajouté !`)
                                            fetchData(currentTeam?.id || '')
                                                ; (document.getElementById('resto-name') as HTMLInputElement).value = ''
                                                ; (document.getElementById('resto-cuisine') as HTMLInputElement).value = ''
                                                ; (document.getElementById('resto-link') as HTMLInputElement).value = ''
                                        }
                                    }}
                                    className="w-full mt-4 bg-[#5D2EE8] hover:bg-[#4A24B8] text-white"
                                >
                                    Ajouter
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Restaurants List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {restaurants.map(resto => (
                                <Card key={resto.id} className="border-2 border-gray-200 shadow-md">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-gray-900">{resto.name}</h3>
                                                {resto.cuisine_type && (
                                                    <p className="text-sm text-gray-500">{resto.cuisine_type}</p>
                                                )}
                                                {resto.rating > 0 && (
                                                    <p className="text-sm text-yellow-600 font-semibold mt-1">
                                                        ⭐ {resto.rating.toFixed(1)} ({resto.rating_count} avis)
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={async () => {
                                                    if (confirm(`Supprimer ${resto.name} ?`)) {
                                                        const { error } = await supabase.from('restaurants').delete().eq('id', resto.id)
                                                        if (error) toast.error("Erreur")
                                                        else {
                                                            toast.success("Supprimé")
                                                            fetchData(currentTeam?.id || '')
                                                        }
                                                    }
                                                }}
                                                className="border-2 border-red-300 text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6 max-w-2xl">
                        <Card className="border-2 border-gray-200 shadow-lg">
                            <CardHeader>
                                <CardTitle>Paramètres de {currentTeam?.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Closing Hour */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Heure de clôture des votes
                                    </label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={23}
                                        defaultValue={currentSettings?.closing_hour || 12}
                                        key={currentSettings?.id}
                                        id="closing-hour"
                                        className="border-2 border-gray-300 text-2xl font-mono h-14"
                                    />
                                    <p className="text-sm text-gray-500 mt-2">
                                        Les résultats s'affichent après cette heure
                                    </p>
                                </div>

                                {/* Active Days */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3">
                                        Jours actifs
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day, idx) => {
                                            const dayValue = idx === 6 ? 0 : idx + 1
                                            return (
                                                <div key={day} className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg hover:border-[#5D2EE8]/50 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        id={`day-${idx}`}
                                                        defaultChecked={currentSettings?.active_days?.includes(dayValue) ?? [1, 2, 3, 4, 5].includes(dayValue)}
                                                        key={`${currentSettings?.id}-${idx}`}
                                                        className="w-5 h-5"
                                                    />
                                                    <label htmlFor={`day-${idx}`} className="font-semibold text-gray-700 cursor-pointer">
                                                        {day}
                                                    </label>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <Button
                                    onClick={async () => {
                                        const hour = parseInt((document.getElementById('closing-hour') as HTMLInputElement).value)
                                        const activeDays: number[] = []

                                            ;['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].forEach((_, idx) => {
                                                if ((document.getElementById(`day-${idx}`) as HTMLInputElement).checked) {
                                                    activeDays.push(idx === 6 ? 0 : idx + 1)
                                                }
                                            })

                                        if (currentSettings?.id) {
                                            // Update existing
                                            const { error } = await supabase.from('app_settings').update({
                                                closing_hour: hour,
                                                active_days: activeDays
                                            }).eq('id', currentSettings.id)

                                            if (error) toast.error("Erreur")
                                            else {
                                                toast.success("Paramètres mis à jour !")
                                                fetchData(currentTeam?.id || '')
                                            }
                                        } else {
                                            // Create new
                                            const { error } = await supabase.from('app_settings').insert({
                                                team_id: currentTeam?.id,
                                                closing_hour: hour,
                                                active_days: activeDays
                                            })

                                            if (error) toast.error("Erreur création")
                                            else {
                                                toast.success("Paramètres créés !")
                                                fetchData(currentTeam?.id || '')
                                            }
                                        }
                                    }}
                                    className="w-full h-14 text-lg font-bold bg-[#5D2EE8] hover:bg-[#4A24B8] text-white"
                                >
                                    Enregistrer les paramètres
                                </Button>

                                {/* Admin Reset Actions */}
                                <div className="mt-8 pt-6 border-t-2 border-gray-200">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">🔄 Actions de réinitialisation</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                                            <div>
                                                <p className="font-bold text-gray-800">Double votes</p>
                                                <p className="text-sm text-gray-600">Réinitialise pour tous les membres</p>
                                            </div>
                                            <Button
                                                onClick={resetAllDoubleVotes}
                                                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold"
                                            >
                                                ⚡ Réinitialiser
                                            </Button>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                                            <div>
                                                <p className="font-bold text-gray-800">Banissements</p>
                                                <p className="text-sm text-gray-600">Permet à tous de bannir à nouveau</p>
                                            </div>
                                            <Button
                                                onClick={resetAllBanishments}
                                                className="bg-red-500 hover:bg-red-600 text-white font-bold"
                                            >
                                                🔨 Réinitialiser
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    )
}
