'use client'

import { motion } from 'framer-motion'
import { Users, Check, Clock } from 'lucide-react'

type VotersPanelProps = {
    votes: Array<{ id: string; user_id: string; restaurant_id: string; is_double?: boolean }>
    restaurants: Array<{ id: string; name: string }>
    profiles?: Array<{ id: string; username: string; double_vote_available?: boolean }>
    totalUsers?: number
}

export function VotersPanel({ votes, restaurants, profiles = [], totalUsers = 0 }: VotersPanelProps) {
    const voterIds = votes.map(v => v.user_id)
    const nonVoters = profiles.filter(p => !voterIds.includes(p.id))

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl border border-white/50 shadow-2xl"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-[#5D2EE8] to-[#E91E63] rounded-2xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-gray-900">Qui a voté ?</h3>
                    <p className="text-sm text-gray-600 font-medium">
                        {votes.length} / {totalUsers || profiles.length} participant{(totalUsers || profiles.length) > 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Votes Grid */}
            {votes.length > 0 ? (
                <div className="space-y-3">
                    {restaurants.map(resto => {
                        const restoVotes = votes.filter(v => v.restaurant_id === resto.id)
                        if (restoVotes.length === 0) return null

                        const totalVoteValue = restoVotes.reduce((sum, v) => sum + (v.is_double ? 2 : 1), 0)

                        return (
                            <div key={resto.id} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 shadow-md">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-black text-gray-900 text-lg">{resto.name}</span>
                                    <span className="px-3 py-1 bg-gradient-to-r from-[#5D2EE8] to-[#E91E63] text-white font-bold rounded-full text-sm shadow-md">
                                        {totalVoteValue} vote{totalVoteValue > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {restoVotes.map(vote => {
                                        const voter = profiles.find(p => p.id === vote.user_id)
                                        const isDouble = vote.is_double

                                        return (
                                            <div
                                                key={vote.id}
                                                className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm
                          ${isDouble
                                                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg'
                                                        : 'bg-white text-gray-700 shadow-md border border-gray-200'
                                                    }
                        `}
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>{voter?.username || 'Anonyme'}</span>
                                                {isDouble && <span className="font-black">⚡</span>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                    <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold">Aucun vote pour le moment</p>
                </div>
            )}

            {/* Non-voters */}
            {nonVoters.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-bold text-gray-600 mb-3 uppercase tracking-wide">
                        Pas encore voté ({nonVoters.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {nonVoters.map(user => (
                            <div
                                key={user.id}
                                className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium border border-gray-200"
                            >
                                {user.username}
                                {user.double_vote_available && <span className="ml-1.5 text-yellow-500">⚡</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    )
}
