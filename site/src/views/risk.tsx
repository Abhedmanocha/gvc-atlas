import type { Screen, View } from '.'

// Placeholder: the sentence is final-ish, the answer and chart come later.
function useScreen(): Screen {
  return { sentence: "Where could {economy}'s {sector} break in {year}?" }
}

export default { id: 'risk', label: 'Risk', useScreen } satisfies View
