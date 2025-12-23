'use client'

// Force dynamic rendering (needed for Supabase auth)
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RestaurantCard } from '@/components/RestaurantCard'
import { SpinWheel } from '@/components/SpinWheel'
import { VotersPanel } from '@/components/VotersPanel'
import { AuthForm } from '@/components/AuthForm'
import { Button } from '@/components/ui/button'
import { becomeAdmin } from './actions'
import { LogOut, Dice5, Trophy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

// Types
type Restaurant = { id: string; name: string; cuisine_type: string; google_maps_link: string; added_by: string }
type Vote = { id: string; user_id: string; restaurant_id: string; vote_date: string; is_double?: boolean }
type Banishment = { id: string; user_id: string; restaurant_id: string; banishment_date: string }

export default function LunchRoulettePage() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [debugHour, setDebugHour] = useState<number | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [banishments, setBanishments] = useState<Banishment[]>([])
  const [lastBanishmentDate, setLastBanishmentDate] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [settings, setSettings] = useState<{ closing_hour: number, active_days: number[] }>({
    closing_hour: 12,
    active_days: [1, 2, 3, 4, 5]
  })

  // NEW: Local selection before confirmation
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null)

  // Wheel state
  const [showWheel, setShowWheel] = useState(false)
  const [finalWinner, setFinalWinner] = useState<Restaurant | null>(null)

  // Double vote and user profile
  const [useDoubleVote, setUseDoubleVote] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [teamProfiles, setTeamProfiles] = useState<any[]>([])  // All team members

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const currentHour = debugHour !== null ? debugHour : now.getHours()
  const currentDay = now.getDay()
  const isResultTime = currentHour >= settings.closing_hour
  const isGameActive = settings.active_days.includes(currentDay)

  // Launch confetti when winner is revealed (MUST be at top level, not in conditional)
  useEffect(() => {
    if (finalWinner) {
      const duration = 5 * 1000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 }

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now()
        if (timeLeft <= 0) return clearInterval(interval)

        const particleCount = 50 * (timeLeft / duration)
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
      }, 250)

      return () => clearInterval(interval)
    }
  }, [finalWinner])

  // Check if user can banish (once per month)
  const canBanish = () => {
    if (!lastBanishmentDate) return true
    const lastBan = new Date(lastBanishmentDate)
    const now = new Date()
    return lastBan.getMonth() !== now.getMonth() || lastBan.getFullYear() !== now.getFullYear()
  }

  // Get current vote from DB
  const getCurrentVote = () => votes.find(v => v.user_id === session?.user?.id)
  const hasConfirmedVote = !!getCurrentVote()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("📱 Initial Session:", currentSession?.user?.email || "No session")
      setSession(currentSession)
      setLoading(false)
      if (currentSession) {
        fetchData(currentSession)
        setupRealtime()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      console.log("🔄 Auth State Changed:", _event, currentSession?.user?.email || "No session")
      setSession(currentSession)
      if (currentSession) {
        fetchData(currentSession)
        setupRealtime()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchData = async (activeSession: any = session) => {
    console.log("🔄 fetchData called with session:", activeSession?.user?.email || "NO SESSION")

    const { data: setts } = await supabase.from('app_settings').select('*').single()
    if (setts) setSettings(setts)

    const { data: restos } = await supabase.from('restaurants').select('*')
    if (restos) setRestaurants(restos)

    const { data: vts } = await supabase.from('votes').select('*').eq('vote_date', todayStr)
    if (vts) setVotes(vts)

    const { data: bans } = await supabase.from('banishments').select('*').eq('banishment_date', todayStr)
    if (bans) setBanishments(bans)

    if (activeSession?.user) {
      console.log("🔍 Checking Admin Status for:", activeSession.user.id)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('last_banishment_date, is_admin, double_vote_available, team_id, is_team_admin')
        .eq('id', activeSession.user.id)
        .single()

      if (error) {
        console.error("❌ Profile Fetch Error:", error)
        toast.error("Erreur profil: " + error.message)
      } else if (profile) {
        console.log("✅ Profile Loaded:", profile)

        // CRITIQUE : Si pas de team_id, rediriger vers create/join team
        if (!profile.team_id) {
          console.log("⚠️ User has no team, redirecting to team selection")
          toast.info("Rejoins ou crée une team pour continuer ! 👥")
          window.location.href = '/create-team'
          return
        }

        setLastBanishmentDate(profile.last_banishment_date)
        setIsAdmin(profile.is_team_admin || false)
        setUserProfile(profile)  // Store full profile for double vote

        // Fetch all team members for voters panel
        if (profile.team_id) {
          const { data: teamMembers } = await supabase
            .from('profiles')
            .select('id, username, double_vote_available')
            .eq('team_id', profile.team_id)

          if (teamMembers) setTeamProfiles(teamMembers)
        }

        if (profile.is_team_admin) {
          console.log("👑 ADMIN MODE ACTIVATED")
          toast.success("Mode Admin Activé 👮‍♂️")
        } else {
          console.log("👤 Regular User Mode")
        }
      }
    } else {
      console.warn("⚠️ No session in fetchData")
    }
  }

  const setupRealtime = () => {
    const channel = supabase
      .channel('lunch-squad')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banishments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }

  const handleSelectRestaurant = (rId: string) => {
    // Just select locally, don't save to DB yet
    setSelectedRestaurant(rId)
  }

  const handleConfirmVote = async () => {
    if (!selectedRestaurant || !session) return

    // Insérer/update le vote
    const { error: voteError } = await supabase.from('votes').upsert({
      user_id: session.user.id,
      restaurant_id: selectedRestaurant,
      vote_date: todayStr,
      is_double: useDoubleVote
    }, { onConflict: 'user_id, vote_date' })

    if (voteError) {
      toast.error("Erreur lors de la confirmation")
      return
    }

    // Si double vote utilisé, mettre à jour le profil
    if (useDoubleVote && userProfile?.double_vote_available) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ double_vote_available: false })
        .eq('id', session.user.id)

      if (profileError) {
        console.error("Erreur mise à jour double vote:", profileError)
      }
    }

    toast.success(useDoubleVote ? "Vote doublé confirmé ! ⚡⚡" : "Vote confirmé ! 🎉")
    setUseDoubleVote(false)  // Reset
    fetchData(session)
  }

  const handleBanish = async (rId: string) => {
    if (!canBanish()) return toast.error("Banissement déjà utilisé ce mois 🚫")
    if (confirm("Confirmer le BANISSEMENT de ce resto pour TOUTE L'ÉQUIPE aujourd'hui ?")) {
      const { error } = await supabase.from('banishments').insert({
        user_id: session.user.id,
        restaurant_id: rId,
        banishment_date: todayStr
      })
      if (!error) {
        toast.success("RESTAURANT BANNI ! 🔨")
        fetchData(session)
      } else {
        toast.error("Erreur banishment: " + error.message)
      }
    }
  }

  const handleRandomVote = () => {
    const valid = restaurants.filter(r => !isBanned(r.id))
    if (valid.length) {
      const random = valid[Math.floor(Math.random() * valid.length)]
      setSelectedRestaurant(random.id)
      toast.info(`${random.name} sélectionné ! Confirme ton choix.`)
    } else {
      toast.error("Aucun choix dispo")
    }
  }

  const getVoteCount = (rId: string) => {
    const restoVotes = votes.filter(v => v.restaurant_id === rId)
    let totalCount = 0
    restoVotes.forEach(v => {
      totalCount += v.is_double ? 2 : 1  // Double vote compte x2
    })
    return totalCount
  }
  const isBanned = (rId: string) => banishments.some(b => b.restaurant_id === rId)
  const hasVoted = (rId: string) => votes.some(v => v.user_id === session?.user?.id && v.restaurant_id === rId)

  const getWinner = () => {
    if (!restaurants.length) return null
    const counts: Record<string, number> = {}
    votes.forEach(v => {
      if (!isBanned(v.restaurant_id)) counts[v.restaurant_id] = (counts[v.restaurant_id] || 0) + 1
    })
    let winnerId: string | null = null
    let maxVotes = -1
    Object.entries(counts).forEach(([id, c]) => {
      if (c > maxVotes) {
        maxVotes = c
        winnerId = id
      }
    })
    return restaurants.find(r => r.id === winnerId) || null
  }

  const DebugControls = () => (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
      <div className="bg-black text-white p-2 text-xs font-mono cursor-pointer border-2 border-white opacity-50 hover:opacity-100"
        onClick={() => setDebugHour(settings.closing_hour - 2)}>
        [DEBUG] AVANT-JEU ({settings.closing_hour - 2}h)
      </div>
      <div className="bg-black text-white p-2 text-xs font-mono cursor-pointer border-2 border-white opacity-50 hover:opacity-100"
        onClick={() => setDebugHour(settings.closing_hour + 1)}>
        [DEBUG] APRES-JEU ({settings.closing_hour + 1}h)
      </div>
      <div className="bg-black text-white p-2 text-xs font-mono cursor-pointer border-2 border-white opacity-50 hover:opacity-100"
        onClick={() => setDebugHour(null)}>
        [DEBUG] RESET TEMPS RÉEL
      </div>
      {!isAdmin && session?.user && (
        <div className="bg-yellow-400 text-black font-black p-2 text-xs cursor-pointer border-2 border-black opacity-80 hover:opacity-100"
          onClick={async () => {
            const res = await becomeAdmin(session.user.id)
            if (res.success) {
              toast.success(res.message)
              fetchData(session)
              window.location.reload()
            } else {
              toast.error(res.message)
            }
          }}>
          👑 DEVENIR ADMIN (MAGIC)
        </div>
      )}
    </div>
  )

  if (loading) return <div className="h-screen w-full flex items-center justify-center font-black text-2xl">CHARGEMENT...</div>

  if (!session) return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#5D2EE8] via-[#8B5CF6] to-[#E91E63] p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-300 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-pink-400 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2.5s' }}></div>
      </div>

      {/* Logo */}
      <div className="relative z-10 text-center space-y-8 mb-8">
        <div className="inline-flex items-center gap-4 justify-center">
          <div className="text-7xl md:text-8xl">🎰</div>
          <div>
            <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent drop-shadow-2xl">
              LunchRoulette
            </h1>
            <p className="text-base text-white/60 font-medium mt-2">by baptiste</p>
          </div>
        </div>
        <p className="text-2xl text-white/90 font-bold drop-shadow-lg">
          La roue de la fortune des déjeuners 🍽️
        </p>
      </div>

      <AuthForm />
    </div>
  )

  if (!isGameActive) {
    return (
      <main className="min-h-screen bg-gray-200 p-4 flex flex-col items-center justify-center text-center space-y-4">
        <h1 className="text-4xl font-black text-gray-400 uppercase">AUJOURD'HUI C'EST FERMÉ 😴</h1>
        <p className="font-bold text-gray-500">Revenez un jour ouvré pour manger.</p>
        {isAdmin && (
          <Button
            onClick={() => window.location.href = '/admin'}
            className="mt-8 bg-[#5D2EE8] hover:bg-[#4A24B8] text-white font-bold"
          >
            ⚙️ Dashboard Admin
          </Button>
        )}
        {!isAdmin && <p className="text-xs text-gray-400">Vous n'êtes pas admin.</p>}
        <DebugControls />
      </main>
    )
  }

  if (isResultTime) {
    const validRestaurants = restaurants.filter(r => !isBanned(r.id))

    return (
      <main className="min-h-screen bg-gradient-to-br from-[#5D2EE8] to-[#E91E63] p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-300 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 space-y-8">
          {!showWheel && !finalWinner && validRestaurants.length > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="text-center space-y-6"
            >
              <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-2xl">
                C'EST L'HEURE ! 🎰
              </h1>
              <p className="text-2xl text-white/90 font-bold">
                {votes.length} vote(s) enregistré(s)
              </p>
              <Button
                onClick={() => setShowWheel(true)}
                className="h-20 px-16 text-3xl font-black bg-white text-[#5D2EE8] hover:bg-gray-100 rounded-full shadow-2xl hover:scale-110 transition-transform"
              >
                🎰 LANCER LA ROUE !
              </Button>
            </motion.div>
          )}

          {showWheel && !finalWinner && (
            <SpinWheel
              restaurants={validRestaurants}
              votes={votes}
              onResult={(winnerId) => {
                const winner = restaurants.find(r => r.id === winnerId)
                setFinalWinner(winner || null)
              }}
            />
          )}

          {finalWinner && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="bg-white p-12 rounded-3xl border-4 border-black shadow-2xl text-center space-y-6"
            >
              <div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-400 rounded-full border-4 border-black">
                <Trophy className="w-16 h-16 text-black" />
              </div>
              <h2 className="text-4xl font-black text-gray-800 uppercase">
                Le Grand Gagnant
              </h2>
              <div className="bg-[#5D2EE8] text-white p-8 rounded-2xl border-4 border-black">
                <h1 className="text-6xl font-black">{finalWinner.name}</h1>
                <p className="text-xl mt-2 opacity-90">{getVoteCount(finalWinner.id)} votes</p>
              </div>
              {finalWinner.google_maps_link && (
                <a
                  href={finalWinner.google_maps_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block px-8 py-4 bg-green-500 text-white font-black text-xl rounded-xl border-4 border-black hover:bg-green-600 transition-colors"
                >
                  🗺️ Y ALLER
                </a>
              )}
            </motion.div>
          )}

          {validRestaurants.length === 0 && (
            <div className="bg-white p-12 rounded-3xl border-4 border-black text-center">
              <h2 className="text-3xl font-black text-gray-800">AUCUN RESTAURANT DISPONIBLE 🤷</h2>
            </div>
          )}
        </div>

        <div className="fixed top-4 right-4 z-50 flex gap-2">
          {isAdmin && (
            <Button
              onClick={() => window.location.href = '/admin'}
              className="bg-white text-[#5D2EE8] font-bold border-2 border-black"
            >
              ⚙️ Admin
            </Button>
          )}
          <Button
            onClick={() => supabase.auth.signOut()}
            variant="outline"
            className="bg-white border-2 border-black font-bold hover:bg-gray-100"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
        <DebugControls />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#5D2EE8] via-[#8B5CF6] to-[#E91E63] pb-20 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-300 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-400 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <DebugControls />

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/10 border-b border-white/20 px-6 py-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🎰</div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent drop-shadow-lg">
                  LunchRoulette
                </h1>
                <span className="text-xs text-white/60 font-medium">by baptiste</span>
              </div>
            </div>
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 border-2 border-white/50 px-3 py-1 text-xs font-black rounded-full text-white shadow-lg">
              v2.0
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button
                onClick={() => window.location.href = '/admin'}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold border-2 border-white/30 shadow-lg"
              >
                ⚙️ Admin
              </Button>
            )}
            <div className="hidden md:flex items-center gap-2 text-sm font-bold glass p-2 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${session ? 'bg-green-400' : 'bg-red-400'} border border-white/50 animate-pulse neon-glow`}></div>
              <span className="text-white/90">{session?.user?.email}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => supabase.auth.signOut()}
              title="Logout"
              className="hover:bg-red-500/20 border-2 border-transparent hover:border-red-400/50 transition-all text-white"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl p-4 space-y-8 mt-4 relative z-10">
        {/* Controls Bar with better Wavestone colors */}
        <div className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl border border-white/50 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-3 w-full md:w-auto flex-wrap">
              <Button
                onClick={handleRandomVote}
                className="h-12 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-xl transition-all"
              >
                <Dice5 className="mr-2 h-5 w-5" /> Aléatoire
              </Button>

              {/* Confirm Vote Button - Prominent Wavestone Purple */}
              {selectedRestaurant && !hasConfirmedVote && (
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleConfirmVote}
                    className={`h-14 rounded-2xl ${useDoubleVote ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 animate-pulse' : 'bg-gradient-to-r from-[#5D2EE8] to-[#E91E63]'} hover:opacity-90 text-white font-black px-10 shadow-xl hover:shadow-2xl transition-all`}
                  >
                    {useDoubleVote ? '⚡⚡ Confirmer Vote Doublé' : '✓ Confirmer mon choix'}
                  </Button>

                  {/* Double Vote Toggle */}
                  {userProfile?.double_vote_available && (
                    <label className="flex items-center gap-2 cursor-pointer bg-yellow-50 border-2 border-yellow-400 rounded-lg px-3 py-2 hover:bg-yellow-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={useDoubleVote}
                        onChange={(e) => setUseDoubleVote(e.target.checked)}
                        className="w-5 h-5 accent-yellow-500"
                      />
                      <span className="font-bold text-sm text-gray-800">
                        ⚡ Doubler mon vote (1/mois)
                      </span>
                    </label>
                  )}

                  {/* Badge if double vote used this month */}
                  {userProfile && !userProfile.double_vote_available && (
                    <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-lg text-center">
                      ⚡ Double vote utilisé ce mois-ci
                    </div>
                  )}
                </div>
              )}

              {/* Reset Vote - Only if confirmed */}
              {hasConfirmedVote && (
                <Button
                  onClick={async () => {
                    if (confirm("Retirer ton vote confirmé ?")) {
                      const { error } = await supabase.from('votes').delete().eq('user_id', session?.user?.id).eq('vote_date', todayStr)
                      if (error) toast.error("Erreur")
                      else {
                        toast.success("Vote retiré !")
                        setSelectedRestaurant(null)
                        setUseDoubleVote(false)
                        fetchData(session)
                      }
                    }
                  }}
                  className="h-12 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  🗑️ Retirer mon vote
                </Button>
              )}
            </div>
            <div className="text-right font-bold text-sm bg-[#5D2EE8]/10 px-4 py-2 rounded-xl border-2 border-[#5D2EE8]/20">
              <span className="text-gray-600">Closing:</span> <span className="text-[#5D2EE8] text-xl ml-1">{settings.closing_hour}:00</span>
            </div>
          </div>

          {/* Selection feedback */}
          {selectedRestaurant && !hasConfirmedVote && (
            <div className="mt-4 p-3 bg-[#5D2EE8]/10 border-l-4 border-[#5D2EE8] rounded">
              <p className="text-sm font-bold text-[#5D2EE8]">
                ✓ {restaurants.find(r => r.id === selectedRestaurant)?.name} sélectionné • Clique sur "Confirmer mon choix"
              </p>
            </div>
          )}

          {hasConfirmedVote && (
            <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
              <p className="text-sm font-bold text-green-700">
                Vote confirmé pour : {restaurants.find(r => r.id === getCurrentVote()?.restaurant_id)?.name}
              </p>
            </div>
          )}
        </div>

        {/* No votes message */}
        {votes.length === 0 && restaurants.filter(r => !isBanned(r.id)).length > 0 && (
          <div className="text-center py-20">
            <p className="text-3xl font-black text-white/90">Aucun vote aujourd'hui 🤷</p>
            <p className="text-xl text-white/70 mt-4">Revenez demain !</p>
          </div>
        )}

        {/* Voters Panel - Who voted for what */}
        {votes.length > 0 && (
          <VotersPanel
            votes={votes}
            restaurants={restaurants}
            profiles={teamProfiles}
            totalUsers={teamProfiles.length}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <AnimatePresence>
            {restaurants.filter(r => !isBanned(r.id)).map(r => (
              <RestaurantCard
                key={r.id}
                name={r.name}
                cuisineType={r.cuisine_type}
                googleMapsLink={r.google_maps_link}
                voteCount={getVoteCount(r.id)}
                isBanned={isBanned(r.id)}
                hasVoted={hasVoted(r.id)}
                isSelected={selectedRestaurant === r.id}
                isConfirmedVote={hasConfirmedVote && getCurrentVote()?.restaurant_id === r.id}
                onVote={() => handleSelectRestaurant(r.id)}
                onBanish={() => handleBanish(r.id)}
                canBanish={canBanish()}
              />
            ))}
          </AnimatePresence>

          {restaurants.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="bg-white/95 backdrop-blur-sm p-12 rounded-3xl border-2 border-[#5D2EE8]/20 inline-block shadow-xl">
                <p className="text-3xl font-black text-gray-800 mb-2">Aucun restaurant configuré</p>
                {isAdmin && (
                  <p className="text-xl text-[#5D2EE8] font-bold">Ajoute-les dans les réglages Admin ⚙️</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rules Explanation Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl border border-white/50 shadow-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-[#5D2EE8] to-[#E91E63] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-3xl">🎲</span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-gray-900 mb-4">Comment ça marche ?</h2>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 text-[#5D2EE8] font-black">1</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">📊 Système de Probabilités</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      Chaque restaurant a <strong>1 chance de base</strong> d'être tiré au sort.
                      Quand tu votes pour un resto, tu lui donnes <strong>+1 chance supplémentaire</strong>.
                      Plus un resto a de votes, plus il a de chances de sortir ! 🎯
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 text-orange-600 font-black">2</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">⚡ Double Vote (1/mois)</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      Une fois par mois, tu peux <strong>doubler ton vote</strong> ! Au lieu de donner +1 chance,
                      tu donnes <strong>+2 chances</strong> au resto de ton choix. Utilise-le stratégiquement !
                      <span className="inline-block ml-1 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-black rounded-full">POWER UP</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 text-pink-600 font-black">3</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">🎰 La Roue de la Fortune</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      À l'heure de fermeture, la <strong>roue tourne</strong> et sélectionne le gagnant en fonction des probabilités.
                      Le suspense est total jusqu'à la fin ! Que le meilleur resto gagne 🏆
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
                <p className="text-sm text-gray-700 font-medium">
                  <strong>💡 Exemple :</strong> Si "Sushi Bar" a 3 votes normaux et 1 double vote,
                  il aura <strong>6 chances</strong> au total : 1 (base) + 3 (votes) + 2 (double) = 6 chances ! 🍣
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
