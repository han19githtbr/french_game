// lib/ably.ts
import Ably from 'ably'

/*export const ablyClient = new Ably.Realtime({
    key: process.env.NEXT_PUBLIC_ABLY_API_KEY!,
    clientId: 'usuario123', // coloque aqui o ID do usuário logado
})*/

export const createAblyClient = (clientId: string) => {
    return new Ably.Realtime({
      key: process.env.NEXT_PUBLIC_ABLY_API_KEY!,
      clientId, // <- ESSENCIAL para usar presence
    })
}
