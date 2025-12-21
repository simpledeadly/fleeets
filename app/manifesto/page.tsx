import { ManifestoEditor } from '@/features/manifesto'

export default function ManifestoPage() {
  return (
    <div className="container mx-auto p-4 sm:p-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Мой Манифест</h1>
        <p className="text-muted-foreground mt-2">
          Определи свои принципы, чтобы AI мог стать твоим вторым пилотом.
        </p>
      </div>

      <ManifestoEditor />
    </div>
  )
}
