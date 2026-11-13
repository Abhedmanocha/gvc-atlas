import type { Screen, View } from '.'

// Placeholder: the sentence is final-ish, the answer and chart come later.
function useScreen(): Screen {
  return { sentence: "How much of {economy}'s {sector} depends on {partner} in {year}?" }
}

export default { id: 'exposure', label: 'Exposure', useScreen } satisfies View
