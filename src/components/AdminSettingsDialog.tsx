'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Settings, Plus, Trash2, Save, MapPin, Utensils } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type Restaurant = {
    id: string
    name: string
    cuisine_type: string | null
    google_maps_link: string | null
}

export function AdminSettingsDialog({ currentSettings, onUpdate }: { currentSettings: any, onUpdate: () => void }) {
    const [open, setOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'schedule' | 'restaurants'>('schedule')

    // Schedule settings
    const [closingHour, setClosingHour] = useState(currentSettings?.closing_hour || 12)
    const [activeDays, setActiveDays] = useState<number[]>(currentSettings?.active_days || [1, 2, 3, 4, 5])

    // Restaurants
    const [restaurants, setRestaurants] = useState<Restaurant[]>([])
    const [newResto, setNewResto] = useState({ name: '', cuisine_type: '', google_maps_link: '' })

    const [loading, setLoading] = useState(false)

    const days = [
        { id: 1, label: 'Lundi' },
        { id: 2, label: 'Mardi' },
        { id: 3, label: 'Mercredi' },
        { id: 4, label: 'Jeudi' },
        { id: 5, label: 'Vendredi' },
        { id: 6, label: 'Samedi' },
        { id: 0, label: 'Dimanche' },
    ]

    useEffect(() => {
        if (open) {
            fetchRestaurants()
        }
    }, [open])

    const fetchRestaurants = async () => {
        const { data } = await supabase.from('restaurants').select('*').order('name')
        if (data) setRestaurants(data)
    }

    const toggleDay = (dayId: number) => {
        if (activeDays.includes(dayId)) {
            setActiveDays(activeDays.filter(d => d !== dayId))
        } else {
            setActiveDays([...activeDays, dayId])
        }
    }

    const handleSaveSchedule = async () => {
        setLoading(true)
        const { error } = await supabase.from('app_settings').update({
            closing_hour: closingHour,
            active_days: activeDays,
            updated_at: new Date()
        }).eq('id', 1)

        setLoading(false)
        if (error) {
            toast.error("Erreur de sauvegarde")
        } else {
            toast.success("Planification mise à jour !")
            onUpdate()
        }
    }

    const handleAddRestaurant = async () => {
        if (!newResto.name.trim()) {
            toast.error("Le nom est requis")
            return
        }

        setLoading(true)
        const { data: session } = await supabase.auth.getSession()
        const { error } = await supabase.from('restaurants').insert({
            name: newResto.name.trim(),
            cuisine_type: newResto.cuisine_type.trim() || null,
            google_maps_link: newResto.google_maps_link.trim() || null,
            added_by: session.session?.user.id
        })

        setLoading(false)
        if (error) {
            toast.error("Erreur ajout restaurant")
        } else {
            toast.success(`${newResto.name} ajouté !`)
            setNewResto({ name: '', cuisine_type: '', google_maps_link: '' })
            fetchRestaurants()
            onUpdate()
        }
    }

    const handleDeleteRestaurant = async (id: string, name: string) => {
        if (!confirm(`Supprimer "${name}" ?`)) return

        const { error } = await supabase.from('restaurants').delete().eq('id', id)
        if (error) {
            toast.error("Erreur suppression")
        } else {
            toast.success(`${name} supprimé`)
            fetchRestaurants()
            onUpdate()
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="icon"
                    className="glass border-2 border-white/20 hover:border-white/40 hover:bg-white/20 transition-all text-white shadow-lg"
                    title="Configuration Admin"
                >
                    <Settings className="w-5 h-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A1F]/95 border-2 border-white/30 shadow-2xl max-w-3xl max-h-[90vh] overflow-hidden flex flex-col backdrop-blur-xl">
                <DialogHeader className="border-b border-white/20 pb-4">
                    <DialogTitle className="text-3xl font-bold text-white flex items-center gap-3">
                        <Settings className="w-8 h-8 text-[#5D2EE8]" />
                        Configuration Admin
                    </DialogTitle>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex gap-2 pt-4">
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'schedule'
                            ? 'bg-[#5D2EE8]/30 border-2 border-[#5D2EE8]/50 text-white shadow-lg'
                            : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/30'
                            }`}
                    >
                        Planification
                    </button>
                    <button
                        onClick={() => setActiveTab('restaurants')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'restaurants'
                            ? 'bg-[#5D2EE8]/30 border-2 border-[#5D2EE8]/50 text-white shadow-lg'
                            : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/30'
                            }`}
                    >
                        Restaurants ({restaurants.length})
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-1">
                    {activeTab === 'schedule' && (
                        <div className="space-y-6">
                            {/* Closing Hour */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-white/90 uppercase tracking-wide">Heure de clôture</label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={23}
                                    value={closingHour}
                                    onChange={e => setClosingHour(parseInt(e.target.value))}
                                    className="bg-white/10 border-2 border-white/20 text-white text-2xl font-mono h-14 focus:border-[#5D2EE8]/50 backdrop-blur-sm"
                                />
                                <p className="text-sm text-white/50">Les résultats s'affichent à {closingHour}h00</p>
                            </div>

                            {/* Active Days */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-white/90 uppercase tracking-wide">Jours actifs</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {days.map(day => (
                                        <button
                                            key={day.id}
                                            onClick={() => toggleDay(day.id)}
                                            className={`p-4 rounded-xl font-bold transition-all ${activeDays.includes(day.id)
                                                ? 'bg-green-500/30 border-2 border-green-400/50 text-white shadow-lg'
                                                : 'bg-white/5 border border-white/10 text-white/40 hover:border-white/30 hover:text-white/70'
                                                }`}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button
                                onClick={handleSaveSchedule}
                                disabled={loading}
                                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#5D2EE8] to-purple-800 hover:from-[#5D2EE8]/90 hover:to-purple-900 border-2 border-white/20 rounded-xl shadow-lg text-white"
                            >
                                {loading ? 'Sauvegarde...' : 'Enregistrer'}
                            </Button>
                        </div>
                    )}

                    {activeTab === 'restaurants' && (
                        <div className="space-y-6">
                            {/* Add New Restaurant */}
                            <div className="bg-white/10 border-2 border-green-400/30 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-green-400" />
                                    Ajouter un restaurant
                                </h3>

                                <Input
                                    placeholder="Nom du restaurant *"
                                    value={newResto.name}
                                    onChange={e => setNewResto({ ...newResto, name: e.target.value })}
                                    className="bg-white/10 border-2 border-white/20 text-white h-12 placeholder:text-white/40"
                                />

                                <div className="flex gap-3 items-start">
                                    <Utensils className="w-5 h-5 text-[#5D2EE8] mt-3" />
                                    <Input
                                        placeholder="Type de cuisine (Italien, Japonais...)"
                                        value={newResto.cuisine_type}
                                        onChange={e => setNewResto({ ...newResto, cuisine_type: e.target.value })}
                                        className="bg-white/10 border-2 border-white/20 text-white h-12 placeholder:text-white/40"
                                    />
                                </div>

                                <div className="flex gap-3 items-start">
                                    <MapPin className="w-5 h-5 text-pink-400 mt-3" />
                                    <Input
                                        placeholder="Lien Google Maps"
                                        value={newResto.google_maps_link}
                                        onChange={e => setNewResto({ ...newResto, google_maps_link: e.target.value })}
                                        className="bg-white/10 border-2 border-white/20 text-white h-12 placeholder:text-white/40"
                                    />
                                </div>

                                <Button
                                    onClick={handleAddRestaurant}
                                    disabled={loading || !newResto.name.trim()}
                                    className="w-full h-12 font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-2 border-white/20 rounded-xl text-white"
                                >
                                    <Plus className="w-5 h-5 mr-2" />
                                    Ajouter
                                </Button>
                            </div>

                            {/* Restaurant List */}
                            <div className="space-y-3">
                                <h3 className="text-lg font-bold text-white/90">Restaurants actuels</h3>
                                {restaurants.length === 0 ? (
                                    <p className="text-white/50 text-center py-8">Aucun restaurant configuré</p>
                                ) : (
                                    restaurants.map(resto => (
                                        <div key={resto.id} className="bg-white/10 border border-white/20 rounded-xl p-4 flex items-center justify-between group hover:border-white/40 transition-all backdrop-blur-sm">
                                            <div>
                                                <p className="font-bold text-white text-lg">{resto.name}</p>
                                                {resto.cuisine_type && (
                                                    <p className="text-sm text-purple-300">{resto.cuisine_type}</p>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteRestaurant(resto.id, resto.name)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 text-red-400 hover:text-red-300"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
