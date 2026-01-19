import { type Metadata } from 'next'

import { SimpleLayout } from '@/components/SimpleLayout'

export const metadata: Metadata = {
  title: 'You’re subscribed',
  description: 'Thanks for subscribing to my newsletter.',
}

export default function ThankYouSubscribing() {
  return (
    <SimpleLayout
      title="Thanks for the message."
      intro="I'll try to response as soon as possible. 🙈"
    />
  )
}
