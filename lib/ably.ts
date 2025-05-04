// lib/ably.ts
import Ably from 'ably'

export const createAblyClient = (clientId: string) => {
    return new Ably.Realtime({
      //key: process.env.NEXT_PUBLIC_ABLY_API_KEY!,
      clientId, // <- ESSENCIAL para usar presence
      authUrl: "/api/createTokenRequest",
    })
}
