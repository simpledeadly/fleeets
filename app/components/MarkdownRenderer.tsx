import ReactMarkdown from 'react-markdown'
import { cn } from "@/lib/utils"

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        // База: prose-sm (мелкий текст), invert (для темной темы)
        "prose prose-sm max-w-none dark:prose-invert",

        // 1. ЦВЕТА И ШРИФТЫ
        "text-foreground", // Основной цвет текста
        "prose-headings:prose-headings:mt-1 prose-headings:text-sm",
        "prose-strong:text-foreground prose-strong:font-bold",
        "prose-a:text-amber-500 prose-a:no-underline hover:prose-a:underline",

        // 2. ОТСТУПЫ (Фикс твоей проблемы "херни")
        // Убираем гигантские отступы у параграфов
        // 4. КОД (Фиолетовый стиль)
        "prose-code:text-[11px] prose-code:font-mono prose-code:text-purple-400 prose-code:bg-purple-500/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",

        // 5. БЛОКИ КОДА
        "prose-pre:bg-secondary/50 prose-pre:text-xs prose-pre:rounded-lg prose-pre:p-3 prose-pre:border prose-pre:border-border",

        // 6. ЦИТАТЫ
        "prose-blockquote:border-l-2 prose-blockquote:border-amber-500/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground",

        className
      )}
    >
      <ReactMarkdown
        components={{
          // Кастомный рендер ссылок, чтобы открывались в новом окне
          a: ({ node, ...props }) => (
            <a target="_blank" rel="noopener noreferrer" {...props} />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}