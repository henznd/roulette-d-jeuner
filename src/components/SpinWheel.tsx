'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'
import { motion } from 'framer-motion'

type Restaurant = {
    id: string
    name: string
    cuisine_type: string | null
}

type SpinWheelProps = {
    restaurants: Restaurant[]
    votes: { restaurant_id: string, is_double?: boolean }[]
    onResult: (winnerId: string) => void
}

export function SpinWheel({ restaurants, votes, onResult }: SpinWheelProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isSpinning, setIsSpinning] = useState(false)
    const [rotation, setRotation] = useState(0)
    const [selectedWinner, setSelectedWinner] = useState<string | null>(null)

    // Calculer probabilités : 1 chance base + votes (x2 si double)
    const calculateChances = () => {
        const chances: { id: string; name: string; chances: number }[] = []

        restaurants.forEach(resto => {
            const restoVotes = votes.filter(v => v.restaurant_id === resto.id)
            let voteCount = 0
            restoVotes.forEach(v => {
                voteCount += v.is_double ? 2 : 1  // Double votes comptent x2
            })
            const totalChances = 1 + voteCount // 1 base + votes
            chances.push({
                id: resto.id,
                name: resto.name,
                chances: totalChances
            })
        })

        return chances
    }

    // Sélection pondérée
    const selectWinner = () => {
        const chances = calculateChances()
        const totalChances = chances.reduce((sum, r) => sum + r.chances, 0)

        let random = Math.random() * totalChances

        for (const resto of chances) {
            random -= resto.chances
            if (random <= 0) {
                return resto.id
            }
        }

        return chances[0].id
    }

    // Dessiner la roue avec effet 3D
    const drawWheel = (currentRotation: number) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const radius = Math.min(centerX, centerY) - 30

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const chances = calculateChances()
        const totalChances = chances.reduce((sum, r) => sum + r.chances, 0)

        let startAngle = currentRotation

        // Couleurs vibrantes avec gradients
        const colors = [
            { start: '#5D2EE8', end: '#8B5CF6' },
            { start: '#E91E63', end: '#EC4899' },
            { start: '#00D9FF', end: '#06B6D4' },
            { start: '#FFD500', end: '#FFA500' },
            { start: '#00FF94', end: '#10B981' },
            { start: '#FF6B9D', end: '#C2185B' }
        ]

        chances.forEach((resto, index) => {
            const sliceAngle = (resto.chances / totalChances) * 2 * Math.PI
            const endAngle = startAngle + sliceAngle

            // Gradient radial pour effet 3D
            const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.3, centerX, centerY, radius)
            const colorPair = colors[index % colors.length]
            gradient.addColorStop(0, colorPair.start)
            gradient.addColorStop(1, colorPair.end)

            // Slice avec ombre intérieure
            ctx.save()
            ctx.beginPath()
            ctx.moveTo(centerX, centerY)
            ctx.arc(centerX, centerY, radius, startAngle, endAngle)
            ctx.closePath()
            ctx.fillStyle = gradient
            ctx.fill()

            // Bordure brillante
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
            ctx.lineWidth = 4
            ctx.stroke()

            // Ombre portée sur chaque slice
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
            ctx.shadowBlur = 10
            ctx.shadowOffsetX = 2
            ctx.shadowOffsetY = 2
            ctx.restore()

            // Texte avec ombre
            ctx.save()
            ctx.translate(centerX, centerY)
            ctx.rotate(startAngle + sliceAngle / 2)
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            // Ombre text
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
            ctx.shadowBlur = 5
            ctx.shadowOffsetX = 2
            ctx.shadowOffsetY = 2

            ctx.fillStyle = 'white'
            ctx.font = 'bold 18px Inter, sans-serif'
            ctx.fillText(resto.name, radius * 0.65, 0)

            // Badge nombre de votes
            if (resto.chances > 1) {
                ctx.font = 'bold 14px Inter, sans-serif'
                ctx.fillStyle = '#FFD700'
                ctx.fillText(`${resto.chances}`, radius * 0.85, 0)
            }

            ctx.restore()

            startAngle = endAngle
        })

        // Centre 3D avec dégradé
        const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 35)
        centerGradient.addColorStop(0, '#FFFFFF')
        centerGradient.addColorStop(1, '#E0E0E0')

        ctx.beginPath()
        ctx.arc(centerX, centerY, 35, 0, 2 * Math.PI)
        ctx.fillStyle = centerGradient
        ctx.fill()
        ctx.strokeStyle = '#5D2EE8'
        ctx.lineWidth = 6
        ctx.stroke()

        // Logo central
        ctx.fillStyle = '#5D2EE8'
        ctx.font = 'bold 24px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('🎰', centerX, centerY)
    }

    // Animation spin améliorée
    const spin = () => {
        if (isSpinning) return

        setIsSpinning(true)
        const winnerId = selectWinner()
        setSelectedWinner(winnerId)

        // Plus de tours pour plus de suspense
        const spins = 7 + Math.floor(Math.random() * 3)  // 7-9 tours
        const randomExtra = Math.random() * 2 * Math.PI
        const totalRotation = spins * 2 * Math.PI + randomExtra

        const duration = 6000 // 6 secondes
        const startTime = Date.now()

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Easing out cubique pour décélération réaliste
            const easeOut = 1 - Math.pow(1 - progress, 4)
            const currentRotation = easeOut * totalRotation

            setRotation(currentRotation)
            drawWheel(currentRotation)

            if (progress < 1) {
                requestAnimationFrame(animate)
            } else {
                setTimeout(() => {
                    onResult(winnerId)
                }, 1000)
            }
        }

        animate()
    }

    useEffect(() => {
        drawWheel(rotation)
    }, [restaurants, votes])

    return (
        <div className="flex flex-col items-center gap-8">
            {/* Canvas Wheel avec effet glow */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className="relative"
            >
                {/* Glow background */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#5D2EE8] to-[#E91E63] rounded-full blur-3xl opacity-40 animate-pulse"></div>

                <canvas
                    ref={canvasRef}
                    width={600}
                    height={600}
                    className="relative drop-shadow-2xl"
                    style={{
                        filter: isSpinning ? 'drop-shadow(0 0 30px rgba(93, 46, 232, 0.8))' : 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.3))'
                    }}
                />

                {/* Indicateur (flèche en haut) améliorée */}
                <motion.div
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4"
                    animate={{ y: isSpinning ? [-4, 0, -4] : -4 }}
                    transition={{ repeat: isSpinning ? Infinity : 0, duration: 0.3 }}
                >
                    <div className="relative">
                        <div className="w-0 h-0 border-l-[25px] border-l-transparent border-r-[25px] border-r-transparent border-t-[50px] border-t-white drop-shadow-2xl"></div>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-2xl -translate-y-1">👇</div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Spin Button amélioré */}
            {!isSpinning && !selectedWinner && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.3 }}
                >
                    <Button
                        onClick={spin}
                        className="h-20 px-16 text-3xl font-black bg-gradient-to-r from-[#5D2EE8] via-[#8B5CF6] to-[#E91E63] hover:from-[#4A24B8] hover:to-[#C2185B] text-white rounded-full shadow-2xl hover:shadow-[0_0_60px_rgba(93,46,232,0.8)] transition-all transform hover:scale-110 animate-pulse border-4 border-white/30"
                    >
                        🎰 LANCER LA ROUE !
                    </Button>
                </motion.div>
            )}

            {isSpinning && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-3xl font-black text-white drop-shadow-lg"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="inline-block"
                    >
                        🎲
                    </motion.div>
                    {' '}La roue tourne...
                </motion.div>
            )}
        </div>
    )
}
