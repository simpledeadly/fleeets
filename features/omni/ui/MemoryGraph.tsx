'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAllItemsWithEmbeddings } from '@/features/ai/actions'
import * as d3 from 'd3-force'
import * as d3Zoom from 'd3-zoom'
import { select } from 'd3-selection'

interface Node extends d3.SimulationNodeDatum {
  id: string
  label: string
  color: string
  type: string
  opacity: number
}

export function MemoryGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null)
  const [transform] = useState({ x: 0, y: 0, k: 1 }) // Зум пока зафиксируем для стабильности
  const [links, setLinks] = useState<any[]>([])

  useEffect(() => {
    getAllItemsWithEmbeddings().then((res) => {
      const parsedNodes = res.map((item: any) => {
        let e = item.embedding
        if (typeof e === 'string') {
          try {
            e = JSON.parse(e.replace('{', '[').replace('}', ']'))
          } catch {
            e = []
          }
        }
        if (!Array.isArray(e) || e.length < 1000) e = Array(1536).fill(0)

        return {
          id: item.id,
          label: item.content,
          type: item.type,
          color:
            item.type === 'task'
              ? '#10b981'
              : item.type === 'note'
              ? '#3b82f6'
              : '#f59e0b',
          opacity: 0.4 + Math.random() * 0.4,
          // Генерируем начальные позиции подальше друг от друга
          x: (Math.random() - 0.5) * 1000,
          y: (Math.random() - 0.5) * 1000,
          embedding: e,
        }
      })
      setNodes(parsedNodes as Node[])
      const newLinks: any[] = []
      for (let i = 0; i < parsedNodes.length; i++) {
        for (let j = i + 1; j < parsedNodes.length; j++) {
          // Косинусное сходство (упрощенно через скалярное произведение, т.к. векторы нормализованы)
          const sim = parsedNodes[i].embedding
            .slice(0, 50)
            .reduce(
              (acc: number, v: number, k: number) =>
                acc + v * parsedNodes[j].embedding[k],
              0
            )
          if (sim > 0.05) {
            // Порог для появления нити
            newLinks.push({
              source: parsedNodes[i].id,
              target: parsedNodes[j].id,
            })
          }
        }
      }
      setLinks(newLinks)
      setLoading(false)
    })
  }, [])

  const transformRef = useRef(d3Zoom.zoomIdentity)

  useEffect(() => {
    if (nodes.length === 0 || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const container = containerRef.current!

    const { width, height } = container.getBoundingClientRect()
    canvas.width = width * dpr
    canvas.height = height * dpr

    // Настройка D3 Zoom
    const zoomBehavior = d3Zoom
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        transformRef.current = event.transform
        render() // Перерисовываем только Canvas
      })

    select(canvas).call(zoomBehavior)

    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force('charge', d3.forceManyBody().strength(-15))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(30)
          .strength(0.2)
      )
      .force('collision', d3.forceCollide().radius(10))

    const render = () => {
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Применяем Zoom & Pan
      const t = transformRef.current
      ctx.translate(t.x * dpr, t.y * dpr)
      ctx.scale(t.k * dpr, t.k * dpr)

      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 0.5
      links.forEach((link) => {
        ctx.moveTo(link.source.x, link.source.y)
        ctx.lineTo(link.target.x, link.target.y)
      })
      ctx.stroke()

      nodes.forEach((node) => {
        const isHovered = hoveredNode?.id === node.id
        ctx.beginPath()
        ctx.arc(node.x!, node.y!, isHovered ? 6 : 2.5, 0, 2 * Math.PI)
        ctx.shadowBlur = isHovered ? 15 : 4
        ctx.shadowColor = node.color
        ctx.fillStyle = node.color
        ctx.globalAlpha = isHovered ? 1 : node.opacity
        ctx.fill()
      })
      ctx.restore()
    }

    simulation.on('tick', render)
    return () => {
      simulation.stop()
    }
  }, [nodes, links])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const t = transformRef.current

    const mx = (e.clientX - rect.left - t.x) / t.k
    const my = (e.clientY - rect.top - t.y) / t.k

    const closest = nodes.find(
      (n) =>
        n.x !== undefined &&
        n.y !== undefined &&
        Math.hypot(n.x - mx, n.y - my) < 20 / t.k
    )
    if (closest?.id !== hoveredNode?.id) {
      setHoveredNode(closest || null)
    }
  }

  if (loading)
    return (
      <div className="h-full flex items-center justify-center font-mono text-xs uppercase tracking-widest opacity-20 text-white">
        Neural mapping...
      </div>
    )

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-zinc-950 overflow-hidden cursor-crosshair"
      onMouseMove={handleMouseMove}
    >
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Header Info */}
      <div className="absolute top-6 left-6 pointer-events-none space-y-1">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
          Neural Synapse Map
        </h2>
        <p className="text-[9px] font-mono text-white/20 italic">
          Visualizing {nodes.length} clusters // RAG-enhanced
        </p>
      </div>

      {/* Тултип (плавающий) - 👇 ТУТ ПРИМЕНИЛИ max-w-60 */}
      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-16 right-10 p-4 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl max-w-60 shadow-2xl pointer-events-none z-50"
          >
            <div className="text-xs font-bold uppercase text-white/40 mb-1">
              {hoveredNode.type}
            </div>
            <div className="text-sm font-medium leading-tight text-white">
              {hoveredNode.label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-6 left-6 flex gap-4 opacity-40 hover:opacity-100 transition-opacity">
        <Legend color="#10b981" label="Tasks" />
        <Legend color="#3b82f6" label="Notes" />
        <Legend color="#f59e0b" label="Ideas" />
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-1 h-1 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-[9px] font-bold text-white/50 uppercase tracking-tighter">
        {label}
      </span>
    </div>
  )
}
