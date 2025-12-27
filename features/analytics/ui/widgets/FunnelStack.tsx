import { motion } from 'framer-motion'

export function FunnelStack({ data }: { data: any[] }) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0)

  return (
    <div className="flex flex-col justify-center h-full gap-4 px-4">
      {/* Графическая полоса */}
      <div className="flex h-6 w-full rounded-full overflow-hidden bg-secondary/30">
        {data.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ width: 0 }}
            animate={{ width: `${(item.value / total) * 100}%` }}
            transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
            className="h-full relative group"
            style={{ backgroundColor: item.color }}
          >
            {/* Тултип при наведении на сегмент */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {item.name}: {item.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Легенда с процентами */}
      <div className="grid grid-cols-2 gap-3">
        {data.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
            <span className="font-bold">
              {Math.round((item.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
