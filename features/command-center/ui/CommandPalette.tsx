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
import { useStore } from "@/lib/store"
import { useCommandCenterStore } from "../model/store"
import { Layers, ListTodo, Focus } from "lucide-react"

export function CommandPalette() {
  const { items, setView, setFocusedItem } = useStore()
  const { isPaletteOpen, closePalette } = useCommandCenterStore()

  const runCommand = (command: () => void) => {
    closePalette()
    command()
  }

  return (
    <CommandDialog open={isPaletteOpen} onOpenChange={closePalette}>
      <CommandInput placeholder="Введите команду или ищите задачу..." />
      <CommandList>
        <CommandEmpty>Ничего не найдено.</CommandEmpty>

        {/* Группа: Навигация */}
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
      </CommandList>
    </CommandDialog>
  )
}