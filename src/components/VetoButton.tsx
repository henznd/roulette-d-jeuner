'use client'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function VetoButton({ onVeto, disabled }: { onVeto: () => void; disabled: boolean }) {
    return (
        <motion.div
            whileHover={{ scale: 1.05, rotate: disabled ? 0 : [-1, 1, -1, 1, 0] }}
            whileTap={{ scale: 0.95 }}
            className="w-full"
        >
            <Button
                onClick={onVeto}
                disabled={disabled}
                className="h-24 w-full text-xl md:text-2xl font-black uppercase tracking-widest border-4 border-black bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-normal"
            >
                <AlertTriangle className="mr-2 md:mr-4 h-6 w-6 md:h-8 md:w-8" />
                {disabled ? "VÉTO ÉPUISÉ 😢" : "POSER MON VÉTO 😡"}
            </Button>
        </motion.div>
    )
}
