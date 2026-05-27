import type { NextApiRequest, NextApiResponse } from 'next'
import { deletePushSubscription } from '../../../lib/push-notifications'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido' })
  }

  const { endpoint } = req.body || {}

  if (!endpoint || typeof endpoint !== 'string') {
    return res.status(400).json({ error: 'Endpoint nao fornecido.' })
  }

  try {
    await deletePushSubscription(endpoint)
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Erro ao remover inscricao push:', error)
    return res.status(500).json({ error: 'Erro ao remover inscricao push.' })
  }
}
