import { describe, expect, it } from 'vitest'
import { namesFromAuth0Profile } from '../../utils/auth0Profile'

describe('namesFromAuth0Profile', () => {
  it('leaves the names empty when Auth0 named the account by its email', () => {
    // An email/password sign-up with no name: Auth0 sets name to the email.
    expect(namesFromAuth0Profile({ name: 'ada@example.com', email: 'ada@example.com' }))
      .toEqual({ firstName: null, lastName: null })
  })

  it('uses the given and family names when Auth0 has them', () => {
    expect(namesFromAuth0Profile({ given_name: 'Ada', family_name: 'Lovelace', name: 'ada@example.com' }))
      .toEqual({ firstName: 'Ada', lastName: 'Lovelace' })
  })

  it('splits a real full name when there is no given name', () => {
    expect(namesFromAuth0Profile({ name: 'Ada King Lovelace' }))
      .toEqual({ firstName: 'Ada', lastName: 'King Lovelace' })
    expect(namesFromAuth0Profile({ name: 'Ada' })).toEqual({ firstName: 'Ada', lastName: null })
  })

  it('leaves the names empty with no profile or no name', () => {
    expect(namesFromAuth0Profile(null)).toEqual({ firstName: null, lastName: null })
    expect(namesFromAuth0Profile({ email: 'ada@example.com' })).toEqual({ firstName: null, lastName: null })
    expect(namesFromAuth0Profile({ name: '   ' })).toEqual({ firstName: null, lastName: null })
  })
})
