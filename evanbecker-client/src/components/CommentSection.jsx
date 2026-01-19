import { Comment } from '@/components/Comment'
import { usePathname } from 'next/navigation'
import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useState } from 'react'
import LoadingSpinnerLarge from '@/components/LoadingSpinnerLarge'
import { useApi } from '@/hooks/useApi'

export function CommentSection() {
  const [comments, setComments] = useState(null)
  const [user, setUser] = useState(null)
  const [commentText, setCommentText] = useState('')

  const pathname = usePathname()
  const splitUrl = pathname.split('/')
  const targetLocation = splitUrl[splitUrl.length - 1]

  const { fetchData: get} = useApi(`comment/${targetLocation}`, { method: 'GET' })
  const { fetchData: post} = useApi(`comment/${targetLocation}`, { method: 'POST' })

  const { getAccessTokenSilently } = useAuth0()
  const addComment = async () => {
    try {
      let added = await post({ commentText })
      setComments([...comments, added])
      setCommentText('')
    } catch (e) {
      console.error("Something didn't work", e)
    }
  }

  const getComments = async () => {
    let data = await get()
    setComments(data)
  }

  const getUser = async () => {
    try {
      const accessToken = await getAccessTokenSilently()
      var call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        mode: 'cors',
      })
      setUser(await call.json())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    getUser().then()
    getComments().then()
  }, [])

  return (
    <>
      <section className="py-8 antialiased lg:py-16">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="inline-flex text-lg font-bold text-slate-200 lg:text-2xl">
              Leave a comment!
            </h2>
          </div>
          <form className="mb-6">
            <div className="mb-4 rounded-lg rounded-t-lg border border-gray-200 border-slate-700 bg-slate-800 px-4 py-2">
              <label htmlFor="comment" className="sr-only">
                Your comment
              </label>
              <textarea
                id="comment"
                rows={6}
                value={commentText}
                className="w-full border-0 bg-slate-800 px-0 text-sm text-slate-200 placeholder-slate-400 focus:ring-0 focus:outline-none"
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                required
              ></textarea>
            </div>
            <button
              type="button"
              className="bg-primary-700 focus:ring-primary-200 focus:ring-primary-900 hover:bg-primary-800 inline-flex items-center rounded-lg px-4 py-2.5 text-center text-xs font-medium text-white focus:ring-4"
              onClick={async () => await addComment()}
            >
              Post comment
            </button>
          </form>
          {comments?.length > 0 &&
            comments.map((x) => {
              return <Comment user={user} seedComment={x} key={x.id} />
            })}
          {!comments && <LoadingSpinnerLarge />}
        </div>
      </section>
    </>
  )
}
