// pages/api/createTokenRequest.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import Ably from 'ably'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]' // ajuste para o seu path real

const ablyRest = new Ably.Rest(process.env.ABLY_API_KEY!)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  // Usa o nome do usuário logado como clientId, ou fallback para 'anonymous'
  const clientId = session?.user?.name || 'anonymous'

  const tokenRequestData = await ablyRest.auth.createTokenRequest({ clientId })

  res.status(200).json(tokenRequestData)
}
