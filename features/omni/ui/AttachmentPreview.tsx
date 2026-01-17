'use client'

import { X, FileText, ImageIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface AttachmentPreviewProps {
  file: File
  onRemove: () => void
}

export function AttachmentPreview({ file, onRemove }: AttachmentPreviewProps) {
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative group shrink-0"
    >
      <div className="w-16 h-16 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center relative">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileText className="text-muted-foreground w-8 h-8" />
        )}

        {/* Overlay */}
        <button
          onClick={onRemove}
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground truncate max-w-16 mt-1">
        {file.name}
      </p>
    </motion.div>
  )
}
