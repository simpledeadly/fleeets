"use client"

import * as React from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Item, useStore } from "@/lib/store"
import { useCommandCenterStore } from "../model/store"
import { Layers, ListTodo, Focus, BrainCircuit, FileText } from "lucide-react"
import { useDebounce } from "@/lib/hooks" // Нам понадобится дебаунс
import { searchWithAI, type SearchResult } from "@/features/ai" // Наш новый экшен

export function CommandPalette() {
  const { items, setView, setFocusedItem } = useStore()
  const { isPaletteOpen, closePalette } = useCommandCenterStore()
  const [value, setValue] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const debouncedQuery = useDebounce(value, 300)

  React.useEffect(() => {
    const isAiMode = debouncedQuery.startsWith('?')
    const searchQuery = isAiMode ? debouncedQuery.substring(1).trim() : debouncedQuery.trim()

    if (searchQuery.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    searchWithAI(searchQuery).then(res => {
      if (value.trim() === searchQuery) {
        setResults(res)
      }
      setIsLoading(false)
    })
  }, [debouncedQuery])

  const handleValueChange = (newValue: string) => {
    setValue(newValue)
    // Если поле очистили, СРАЗУ чистим и результаты
    if (newValue.trim() === "") {
      setResults([])
    }
  }

  const runCommand = (command: () => void) => {
    closePalette()
    command()
  }

  const isAiMode = value.startsWith('?')

  return (
    <CommandDialog open={isPaletteOpen} onOpenChange={(open) => {
      if (!open) {
        closePalette()
        setValue("")
        setResults([])
      }
    }}>
      <CommandInput
        value={value}
        onValueChange={handleValueChange}
        placeholder={isAiMode ? "Спроси что-нибудь у своей памяти..." : "Найти задачу или ввести команду..."}
      />
      <CommandList>
        <CommandEmpty>{isLoading ? "Поиск..." : "Ничего не найдено."}</CommandEmpty>

        {results.length > 0 && (
          <CommandGroup heading="Результаты поиска">
            {results.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => runCommand(() => setFocusedItem(item as Item))}
              >
                {/* Иконка, показывающая тип поиска */}
                {item.search_type === 'semantic'
                  ? <BrainCircuit className="mr-2 h-4 w-4 text-purple-500" />
                  : <FileText className="mr-2 h-4 w-4 text-blue-500" />
                }
                <span>{item.content}</span>
                {item.similarity && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {Math.round(item.similarity * 100)}%
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Группа: Навигация */}
        {results.length === 0 && !isLoading && !value.trim() && (
          <>
            <CommandGroup heading="Навигация">
              <CommandItem onSelect={() => runCommand(() => setView('inbox'))}>
                <Layers className="mr-2 h-4 w-4" />
                <span>Перейти в Инбокс</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setView('focus'))}>
                <Focus className="mr-2 h-4 w-4" />
                <span>Перейти в Фокус</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setView('plan'))}>
                <ListTodo className="mr-2 h-4 w-4" />
                <span>Перейти в План</span>
              </CommandItem>
            </CommandGroup>

            {/* Группа: Задачи */}
            <CommandGroup heading="Задачи">
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.content} // По этому полю идет поиск
                  onSelect={() => runCommand(() => setFocusedItem(item))}
                >
                  <span>{item.content}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}