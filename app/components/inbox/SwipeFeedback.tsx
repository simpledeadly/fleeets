import { motion, MotionValue } from "framer-motion"

interface SwipeFeedbackProps {
  x: MotionValue<number>
  actionTextOpacity: MotionValue<number>
  actionTextLeft: MotionValue<string>
  actionTextRight: MotionValue<string>
  background: MotionValue<string>
}

export function SwipeFeedback({ x, actionTextOpacity, actionTextLeft, actionTextRight, background }: SwipeFeedbackProps) {
  return (
    <>
      <motion.div style={{ backgroundColor: background }} className="absolute inset-0 rounded-3xl -z-10" />
      <motion.span style={{ opacity: actionTextOpacity }} className="absolute top-1/2 -translate-y-1/2 -left-24 text-2xl text-red-500 font-bold tracking-wider pointer-events-none">
        {actionTextLeft}
      </motion.span>
      <motion.span style={{ opacity: actionTextOpacity }} className="absolute top-1/2 -translate-y-1/2 -right-28 text-2xl text-green-500 font-bold tracking-wider pointer-events-none">
        {actionTextRight}
      </motion.span>
    </>
  )
}