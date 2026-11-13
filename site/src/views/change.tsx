import type { Screen, View } from '.'

// Placeholder: the sentence is final-ish, the answer and chart come later.
function useScreen(): Screen {
  return { sentence: "What changed for {economy}'s {sector} by {year}?" }
}

export default { id: 'change', label: 'Change', useScreen } satisfies View
