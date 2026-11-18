/**
 * reCAPTCHA v3 for a form that anyone can send: loads Google's script when the site key is set, and gets a token
 * for an action. The API verifies the token and refuses the form without a passing one, so with no site key
 * configured the form can't be sent.
 */
export function useRecaptcha() {
  const config = useRuntimeConfig()
  const siteKey = config.public.recaptchaSiteKey as string | undefined

  useHead({
    script: siteKey ? [{ src: `https://www.google.com/recaptcha/api.js?render=${siteKey}`, async: true }] : [],
  })

  async function token(action: string): Promise<string> {
    if (!siteKey) return ''
    await new Promise<void>((resolve) => {
      if (window.grecaptcha?.ready) window.grecaptcha.ready(() => resolve())
      else resolve()
    })
    return (await window.grecaptcha?.execute(siteKey, { action })) ?? ''
  }

  return { token }
}
