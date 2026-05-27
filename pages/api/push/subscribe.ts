import type { NextApiRequest, NextApiResponse } from 'next'
import { savePushSubscription } from '../../../lib/push-notifications'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido' })
  }

  const { subscription, userEmail } = req.body || {}

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: 'Inscricao push invalida.' })
  }

  try {
    await savePushSubscription(subscription, userEmail)
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Erro ao salvar inscricao push:', error)
    return res.status(500).json({ error: 'Erro ao salvar inscricao push.' })
  }
}
