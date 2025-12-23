'use client'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Trophy, PartyPopper } from 'lucide-react'
import confetti from 'canvas-confetti'

interface Restaurant {
    id: string
    name: string
    google_maps_link: string | null
}

interface ResultsViewProps {
    winner: Restaurant
    voteCount: number
}

export function ResultsView({ winner, voteCount }: ResultsViewProps) {

    useEffect(() => {
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in duration-1000">
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
                <div className="bg-yellow-400 p-8 rounded-full border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <Trophy className="w-24 h-24 text-black" />
                </div>
            </motion.div>

            <div className="space-y-4">
                <h2 className="text-4xl font-black uppercase tracking-widest bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rotate-2">
                    Le grand gagnant est...
                </h2>

                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-primary text-primary-foreground p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -rotate-1"
                >
                    <h1 className="text-5xl md:text-7xl font-black mb-4">{winner.name}</h1>
                    <p className="text-2xl font-bold">{voteCount} Votes</p>

                    {winner.google_maps_link && (
                        <a
                            href={winner.google_maps_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block mt-6 px-8 py-3 bg-white text-black font-black text-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                        >
                            Y ALLER 🗺️
                        </a>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
