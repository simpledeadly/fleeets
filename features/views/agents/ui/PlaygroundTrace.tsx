// features/agents/ui/PlaygroundTrace.tsx

import { ExecutionTrace } from '@/features/agents'
import { CheckCircle2, XCircle, ShieldAlert, FlaskConical } from 'lucide-react'

export function PlaygroundTrace({ trace }: { trace: ExecutionTrace[] }) {
  const icons: Record<string, any> = {
    success: <CheckCircle2 size={14} className="text-green-500" />,
    error: <XCircle size={14} className="text-red-500" />,
    blocked: <ShieldAlert size={14} className="text-orange-500" />,
    mocked: <FlaskConical size={14} className="text-blue-500" />,
  }

  return (
    <div className="space-y-2">
      {trace.map((step, i) => (
        <div
          key={i}
          className="p-2 bg-white/5 rounded border border-white/5 text-[11px]"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 font-mono font-bold uppercase tracking-tighter">
              {icons[step.status]} {step.domain}:{step.tool}
            </div>
            <span
              className={`text-[9px] px-1 rounded ${
                step.status === 'success'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {step.status}
            </span>
          </div>
          <pre className="mt-1 p-1.5 bg-black/40 rounded text-[10px] text-white/60 overflow-x-auto">
            {JSON.stringify(step.input_payload, null, 2)}
          </pre>
          {step.error_details && (
            <p className="mt-1 text-red-400 font-mono text-[9px] italic">
              {step.error_details}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
