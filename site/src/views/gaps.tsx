import type { Screen, View } from '.'

// Placeholder: the sentence is final-ish, the answer and chart come later.
function useScreen(): Screen {
  return { sentence: "What does {economy}'s {sector} lack in {year}?" }
}

export default { id: 'gaps', label: 'Gaps', useScreen } satisfies View
