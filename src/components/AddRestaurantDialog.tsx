'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabase'

export function AddRestaurantDialog({ onRestaurantAdded }: { onRestaurantAdded: () => void }) {
    const [name, setName] = useState('')
    const [cuisine, setCuisine] = useState('')
    const [link, setLink] = useState('')
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const { error } = await supabase.from('restaurants').insert({
            name,
            cuisine_type: cuisine,
            google_maps_link: link,
            added_by: user.id
        })

        setLoading(false)
        if (!error) {
            setOpen(false)
            setName('')
            setCuisine('')
            setLink('')
            onRestaurantAdded()
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-accent text-accent-foreground font-bold hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                    + AJOUTER UN RESTO
                </Button>
            </DialogTrigger>
            <DialogContent className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:max-w-[425px] bg-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase">Nouveau Resto 🥪</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase">Nom du restaurant</label>
                        <Input required value={name} onChange={e => setName(e.target.value)} className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold text-lg" placeholder="Ex: Chez Dédé" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase">Type de cuisine</label>
                        <Input value={cuisine} onChange={e => setCuisine(e.target.value)} className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-mono" placeholder="Ex: Burger, Sushi..." />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold uppercase">Lien Google Maps</label>
                        <Input value={link} onChange={e => setLink(e.target.value)} className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-mono" placeholder="https://maps.google..." />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black text-xl py-6 bg-primary text-primary-foreground transition-all">
                        {loading ? 'AJOUT...' : 'VALIDER 🚀'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
