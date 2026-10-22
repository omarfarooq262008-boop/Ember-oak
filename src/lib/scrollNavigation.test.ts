import { describe, expect, it } from 'vitest'

import { decideScrollOnNavigation } from './scrollNavigation'

describe('decideScrollOnNavigation', () => {
  it('scrolls to top when the pathname changes on PUSH', () => {
    expect(
      decideScrollOnNavigation({
        pathnameChanged: true,
        hash: '',
        navigationType: 'PUSH',
      }),
    ).toEqual({ action: 'top' })
  })

  it('scrolls to top on REPLACE pathname change', () => {
    expect(
      decideScrollOnNavigation({
        pathnameChanged: true,
        hash: '',
        navigationType: 'REPLACE',
      }),
    ).toEqual({ action: 'top' })
  })

  it('does not force scroll when only the query string would change (pathname unchanged)', () => {
    expect(
      decideScrollOnNavigation({
        pathnameChanged: false,
        hash: '',
        navigationType: 'PUSH',
      }),
    ).toEqual({ action: 'none' })
  })

  it('scrolls to the hash target when the URL has a hash on a new page', () => {
    expect(
      decideScrollOnNavigation({
        pathnameChanged: true,
        hash: '#reviews',
        navigationType: 'PUSH',
      }),
    ).toEqual({ action: 'hash', hash: '#reviews' })
  })

  it('restores scroll on back/forward when a position was saved', () => {
    expect(
      decideScrollOnNavigation({
        pathnameChanged: true,
        hash: '',
        navigationType: 'POP',
        savedY: 420,
      }),
    ).toEqual({ action: 'restore', y: 420 })
  })

  it('does not jump to top on POP without a saved position', () => {
    expect(
      decideScrollOnNavigation({
        pathnameChanged: true,
        hash: '',
        navigationType: 'POP',
      }),
    ).toEqual({ action: 'none' })
  })
})
