import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
} from '@microsoft/signalr'

export function useCommentHub(targetLocation: string) {
  const baseUrl = useApiBase()

  let connection: HubConnection | null = null

  async function start(
    onNewComment: (comment: any) => void,
    onNewReply: (commentId: string, reply: any) => void,
  ) {
    connection = new HubConnectionBuilder()
      // Credentials: Cloudflare Access on test needs its cookie (see utils/apiBase.ts).
      .withUrl(`${baseUrl}/hubs/comments`, { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on('NewComment', onNewComment)
    connection.on('NewReply', onNewReply)

    await connection.start()
    await connection.invoke('JoinLocation', targetLocation)
  }

  async function stop() {
    if (!connection) return
    try {
      await connection.invoke('LeaveLocation', targetLocation)
    } catch {
      // ignore if already disconnected
    }
    await connection.stop()
    connection = null
  }

  return { start, stop }
}
