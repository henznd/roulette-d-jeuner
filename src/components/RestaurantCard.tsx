'use client'

import { motion } from 'framer-motion'
import { Button } from './ui/button'
import { MapPin, Star, Ban, Check } from 'lucide-react'

type RestaurantCardProps = {
    name: string
    cuisineType: string | null
    googleMapsLink: string | null
    voteCount: number
    isBanned: boolean
    hasVoted: boolean
    isSelected: boolean
    isConfirmedVote: boolean
    onVote: () => void
    onBanish?: () => void
    canBanish?: boolean
}

export function RestaurantCard({
    name,
    cuisineType,
    googleMapsLink,
    voteCount,
    isBanned,
    hasVoted,
    isSelected,
    isConfirmedVote,
    onVote,
    onBanish,
    canBanish
}: RestaurantCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative group"
        >
            {/* Card Container - Apple Style */}
            <div
                className={`
          relative overflow-hidden rounded-3xl transition-all duration-300
          ${isBanned
                        ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                        : isConfirmedVote
                            ? 'bg-gradient-to-br from-green-50 to-emerald-100 shadow-xl ring-4 ring-green-400/50'
                            : isSelected
                                ? 'bg-gradient-to-br from-white to-purple-50 shadow-2xl ring-4 ring-[#5D2EE8]/50'
                                : 'bg-white hover:bg-gradient-to-br hover:from-white hover:to-gray-50 shadow-lg hover:shadow-2xl'
                    }
        `}
            >
                {/* Glow Effect */}
                {!isBanned && (isSelected || isConfirmedVote) && (
                    <div className={`absolute inset-0 ${isConfirmedVote ? 'bg-gradient-to-br from-green-400/10 to-emerald-500/10' : 'bg-gradient-to-br from-[#5D2EE8]/10 to-[#E91E63]/10'} animate-pulse`}></div>
                )}

                <div className="relative p-6 space-y-4">
                    {/* Header with Badge */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                            <h3 className={`text-2xl font-black tracking-tight ${isBanned ? 'text-gray-400' : 'text-gray-900'}`}>
                                {name}
                            </h3>
                            {cuisineType && (
                                <p className={`text-sm font-medium mt-1 ${isBanned ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {cuisineType}
                                </p>
                            )}
                        </div>

                        {/* Vote Badge */}
                        {voteCount > 0 && !isBanned && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-[#5D2EE8] to-[#E91E63] rounded-full shadow-lg"
                            >
                                <span className="text-white font-black text-lg">{voteCount}</span>
                                <span className="text-white/90 text-xs font-bold">vote{voteCount > 1 ? 's' : ''}</span>
                            </motion.div>
                        )}

                        {isBanned && (
                            <div className="flex items-center gap-1 px-3 py-2 bg-gray-300 rounded-full">
                                <Ban className="w-4 h-4 text-gray-600" />
                                <span className="text-xs font-bold text-gray-600">Banni</span>
                            </div>
                        )}
                    </div>

                    {/* Status Indicator */}
                    {!isBanned && (
                        <div className="flex items-center gap-2">
                            {isConfirmedVote && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-green-500 rounded-xl text-white font-bold text-sm">
                                    <Check className="w-4 h-4" />
                                    Voté ✓
                                </div>
                            )}
                            {isSelected && !isConfirmedVote && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-[#5D2EE8] rounded-xl text-white font-bold text-sm animate-pulse">
                                    <Star className="w-4 h-4 fill-current" />
                                    Sélectionné
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2">
                        {!isBanned && (
                            <Button
                                onClick={onVote}
                                disabled={isConfirmedVote}
                                className={`
                  w-full h-14 text-lg font-black rounded-2xl transition-all duration-300
                  ${isConfirmedVote
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        : isSelected
                                            ? 'bg-gradient-to-r from-[#5D2EE8] to-[#E91E63] text-white shadow-lg hover:shadow-xl'
                                            : 'bg-white border-3 border-gray-200 text-gray-900 hover:border-[#5D2EE8] hover:text-[#5D2EE8] shadow-md hover:shadow-lg'
                                    }
                `}
                            >
                                {isConfirmedVote ? '✓ Confirmé' : isSelected ? 'Sélectionné' : 'Sélectionner'}
                            </Button>
                        )}

                        {!isBanned && googleMapsLink && (
                            <a
                                href={googleMapsLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-[#5D2EE8] hover:text-[#4A24B8] transition-colors"
                            >
                                <MapPin className="w-4 h-4" />
                                Voir sur Maps
                            </a>
                        )}

                        {canBanish && onBanish && !isBanned && (
                            <Button
                                onClick={onBanish}
                                className="w-full h-11 bg-gradient-to-r from-red-700 via-red-800 to-red-900 hover:from-red-800 hover:via-red-900 hover:to-black text-white font-black rounded-xl shadow-xl hover:shadow-2xl transition-all border-2 border-red-900/50"
                            >
                                <Ban className="w-4 h-4 mr-2" />
                                🔨 BANNIR (1/mois)
                            </Button>
                        )}
                    </div>
                </div>

                {/* Corner Accent */}
                {!isBanned && (isSelected || isConfirmedVote) && (
                    <div className={`absolute top-0 right-0 w-20 h-20 ${isConfirmedVote ? 'bg-gradient-to-bl from-green-400' : 'bg-gradient-to-bl from-[#5D2EE8]'} opacity-20 rounded-bl-full`}></div>
                )}
            </div>
        </motion.div>
    )
}
