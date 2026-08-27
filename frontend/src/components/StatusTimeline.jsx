import { Check } from 'lucide-react'

const DEFAULT_STAGES = ['Inquiry', 'Order', 'BOQ', 'Staffing', 'Execution', 'Completion']

export default function StatusTimeline({ stages = DEFAULT_STAGES, currentIndex }) {
  return (
    <ol>
      {stages.map((stage, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        const isLast = i === stages.length - 1

        return (
          <li key={stage} className="relative flex gap-3 pb-8 last:pb-0">
            {!isLast && (
              <span
                className={`absolute left-[15px] top-8 h-full w-0.5 ${done ? 'bg-brand-600' : 'bg-gray-200'}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors duration-200 ${
                done
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : active
                    ? 'border-brand-600 bg-white text-brand-600'
                    : 'border-gray-300 bg-white text-gray-400'
              }`}
            >
              {done ? <Check size={16} /> : i + 1}
            </span>
            <span className={`pt-1 text-sm font-medium ${active ? 'text-brand-700' : done ? 'text-gray-700' : 'text-gray-400'}`}>
              {stage}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
