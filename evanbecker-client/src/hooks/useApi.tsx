import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useState } from 'react'

export const useApi = (url: string, init: RequestInit) => {
  const { getAccessTokenSilently, loginWithRedirect } = useAuth0()
  const [data, setData] = useState({} as any)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState({} as unknown)

  const getToken = async () => {
    let accessToken = '<ERROR>'
    try {
      accessToken = await getAccessTokenSilently()
    } catch (error) {
      await loginWithRedirect()
    }
    return accessToken
  }
  
  const fetchData = async (body = null) => {
    const accessToken = await getToken()
    try{
      let options = {
        method: 'GET', // default to GET if not given
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      } as RequestInit

      if (options.method !== 'GET') {
        console.log({body})
        options.body = JSON.stringify(body)
      }

      console.log({options})

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}api/v1/${url}`,
        options,
      )

      const result = await response.json()
      setData(result)
      return result
    }
    catch (error)
    {
      setError(error)
    }

    setIsLoading(false)
  }

  return { data, isLoading, error, fetchData }
}