/**
 * The data behind the Virtual Backlog figure (public/figures/virtual-backlog-passes.json): Zeroset's
 * spec statements and the evidence that covers them, anonymized to positions and numbers only.
 */
export interface BacklogFigureData {
  about: string
  /** Pass names, from "none" (no evidence) to the last kind of evidence added. */
  passes: string[]
  threshold: number
  /** Flat, four per statement: x, y (0 to 1000), the first pass that covers it (0 = never), declared untested (0 or 1). */
  statements: number[]
  /** Flat, three per item: x, y (0 to 1000), the pass that adds it. */
  evidence: number[]
}

/** The share of statements covered once passes 1 to `pass` have run, for every pass from 0. */
export function coverageByPass(data: BacklogFigureData): number[] {
  const total = data.statements.length / 4
  const firstCovered = new Array<number>(data.passes.length).fill(0)
  for (let i = 0; i < data.statements.length; i += 4) {
    const first = data.statements[i + 2]
    if (first > 0 && first < firstCovered.length) firstCovered[first]++
  }
  let covered = 0
  return firstCovered.map((count) => {
    covered += count
    return total ? covered / total : 0
  })
}

/** How many statements no pass covers: the gap. */
export function gapSize(data: BacklogFigureData): number {
  let gap = 0
  for (let i = 0; i < data.statements.length; i += 4) if (data.statements[i + 2] === 0) gap++
  return gap
}

/** Coverage at a fractional pass, for the animation between two passes. */
export function coverageAt(coverage: number[], shown: number): number {
  if (!coverage.length) return 0
  const clamped = Math.min(Math.max(shown, 0), coverage.length - 1)
  const lower = Math.floor(clamped)
  const upper = Math.min(lower + 1, coverage.length - 1)
  return coverage[lower] + (coverage[upper] - coverage[lower]) * (clamped - lower)
}
