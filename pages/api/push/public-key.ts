import type { NextApiRequest, NextApiResponse } from 'next'
import { getVapidPublicKey } from '../../../lib/push-notifications'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo nao permitido' })
  }

  const publicKey = getVapidPublicKey()

  if (!publicKey) {
    return res.status(503).json({
      error: 'Web Push nao configurado.',
      missingEnv: ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'],
    })
  }

  return res.status(200).json({ publicKey })
}
