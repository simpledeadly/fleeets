import { motion } from "framer-motion"
import { useTypewriter } from '@/lib/hooks/useTypewriter'
import { useStore } from '@/lib/store'

export function BrainResponse({ text, sources }: { text: string, sources: any[] }) {
  const { setFocusedItem } = useStore()
  const typedText = useTypewriter(text, 5)

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Ответ AI</p>
      <div className="space-y-3 w-full">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {typedText}
          {/* Курсор, пока печатает */}
          {typedText.length < text.length && (
            <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-amber-400 animate-pulse" />
          )}
        </p>

        {sources.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }} // Чуть позже текста
            className="pt-2 border-t border-border"
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Источники</p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {sources.slice(0, 3).map((src: any) => (
                <div key={src.id} onClick={() => setFocusedItem(src)} className="shrink-0 max-w-30 py-1 px-2 rounded-lg bg-muted-foreground/10 border border-border/60 text-xs truncate hover:border-muted-foreground/30 duration-150 cursor-pointer">
                  {src.content}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}