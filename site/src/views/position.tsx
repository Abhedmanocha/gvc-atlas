import type { Screen, View } from '.'

// Placeholder: the sentence is final-ish, the answer and chart come later.
function useScreen(): Screen {
  return { sentence: "Where does {economy}'s {sector} sit in the chain in {year}?" }
}

export default { id: 'position', label: 'Position', useScreen } satisfies View
