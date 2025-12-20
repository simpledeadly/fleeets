"use client"
import { Item, useStore } from "@/lib/store"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { updateItem, softDeleteItem } from "../model/actions"
import { toast } from "sonner"
import { useState } from "react"

export function ItemEditor() {
  const { editingItem, setEditingItem, updateItem: updateStoreItem } = useStore()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async (data: Partial<Item>) => {
    if (!editingItem) return
    setIsUpdating(true)

    const oldItem = { ...editingItem }
    updateStoreItem({ ...editingItem, ...data })

    const result = await updateItem(editingItem.id, data)

    setIsUpdating(false)
    if (result.error) {
      toast.error("Ошибка обновления")
      updateStoreItem(oldItem)
    } else {
      toast.success("Сохранено!")
    }
  }

  const handleDelete = async () => {
    if (!editingItem) return
    const tempItem = { ...editingItem }
    setEditingItem(null)
    await softDeleteItem(tempItem.id)
    toast.success("Задача перемещена в корзину")
  }

  return (
    <Sheet open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
      <SheetContent>
        {editingItem && (
          <>
            <SheetHeader>
              <SheetTitle>Редактирование</SheetTitle>
              <SheetDescription>Измените детали задачи здесь.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-6 py-4">
              <Input
                defaultValue={editingItem.content}
                onBlur={(e) => handleUpdate({ content: e.target.value })}
              />
              <Textarea
                defaultValue={editingItem.description || ""}
                placeholder="Описание..."
                onBlur={(e) => handleUpdate({ description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={editingItem.status || 'inbox'}
                  onValueChange={(value) => handleUpdate({ status: value as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbox">Inbox</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="planned">Plan</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={editingItem.type || 'task'}
                  onValueChange={(value) => handleUpdate({ type: value as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="thought">Thought</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <label className="text-sm font-medium">⚡️ Быстрая задача</label>
                <Switch
                  checked={editingItem.is_quick || false}
                  onCheckedChange={(checked) => handleUpdate({ is_quick: checked })}
                />
              </div>
              <Button variant="destructive" onClick={handleDelete}>В корзину</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}