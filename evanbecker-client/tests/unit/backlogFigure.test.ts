import { describe, expect, it } from 'vitest'
import data from '../../public/figures/virtual-backlog-passes.json'
import { coverageAt, coverageByPass, gapSize, type BacklogFigureData } from '../../utils/backlogFigure'

const figure = data as BacklogFigureData

describe('the Virtual Backlog figure data', () => {
  it('matches the numbers the article quotes', () => {
    expect(figure.statements.length / 4).toBe(4757)
    expect(figure.evidence.length / 3).toBe(14301)
    expect(gapSize(figure)).toBe(678)
    expect(coverageByPass(figure).map((c) => Number((c * 100).toFixed(1)))).toEqual([0, 80.3, 80.7, 85.6, 85.7])
    expect(figure.threshold).toBeCloseTo(0.747, 3)
  })

  it('holds numbers only, apart from its note and the pass names', () => {
    // Zeroset's repo is private: no statement or test text may reach this public file.
    expect(Object.keys(figure).sort()).toEqual(['about', 'evidence', 'passes', 'statements', 'threshold'])
    expect(figure.passes).toEqual(['none', 'unit tests', 'e2e tests', 'code docs', 'current-state docs'])
    expect(figure.statements.every((v) => Number.isInteger(v) && v >= 0 && v <= 1000)).toBe(true)
    expect(figure.evidence.every((v) => Number.isInteger(v) && v >= 0 && v <= 1000)).toBe(true)
  })
})

describe('coverageAt', () => {
  it('interpolates between passes and clamps at the ends', () => {
    const coverage = [0, 0.8, 0.9]
    expect(coverageAt(coverage, 0.5)).toBeCloseTo(0.4)
    expect(coverageAt(coverage, 1.5)).toBeCloseTo(0.85)
    expect(coverageAt(coverage, -1)).toBe(0)
    expect(coverageAt(coverage, 9)).toBe(0.9)
    expect(coverageAt([], 1)).toBe(0)
  })
})
