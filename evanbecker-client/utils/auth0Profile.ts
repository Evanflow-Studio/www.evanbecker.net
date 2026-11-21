/** The parts of an Auth0 ID-token profile the site reads. */
export interface Auth0Profile {
  given_name?: string
  family_name?: string
  name?: string
  email?: string
}

/**
 * First and last name for the API's user row. Auth0 sets `name` to the email address when a
 * sign-up gave no name, so an email is never used as a name: without a given name or a real
 * name, both are null and the user fills them in on the account page.
 */
export function namesFromAuth0Profile(profile: Auth0Profile | null | undefined): {
  firstName: string | null
  lastName: string | null
} {
  const given = profile?.given_name?.trim()
  if (given && !given.includes('@')) {
    return { firstName: given, lastName: profile?.family_name?.trim() || null }
  }
  const name = profile?.name?.trim()
  if (!name || name.includes('@')) return { firstName: null, lastName: null }
  const [first, ...rest] = name.split(/\s+/)
  return { firstName: first, lastName: rest.join(' ') || null }
}
