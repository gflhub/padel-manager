'use client'

import { useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { FeedbackDialog } from './feedback-dialog'

/**
 * Botão flutuante de feedback — canto inferior direito.
 * 50% de opacidade por padrão, 100% no hover.
 * Exibe tooltip ao passar o mouse.
 */
export function FeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 group">
        {/* Tooltip */}
        <div
          className="
            absolute bottom-full right-0 mb-2
            bg-gray-900 text-white text-xs font-medium
            px-3 py-1.5 rounded-lg whitespace-nowrap
            opacity-0 pointer-events-none
            group-hover:opacity-100
            transition-opacity duration-200
            shadow-lg
          "
        >
          Enviar Feedback / Reportar Problema
          {/* Seta do tooltip */}
          <span className="absolute top-full right-4 border-4 border-transparent border-t-gray-900" />
        </div>

        {/* Botão */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Enviar feedback ou reportar problema"
          className="
            flex items-center justify-center
            w-12 h-12 rounded-full
            bg-primary text-primary-foreground
            shadow-lg
            opacity-50 hover:opacity-100
            hover:scale-110
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          "
        >
          <MessageSquarePlus className="h-5 w-5" />
        </button>
      </div>

      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
