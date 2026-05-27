import webpush, { PushSubscription } from 'web-push'
import { getDb } from './mongodb'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

const isPushConfigured = () => Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)

const configureWebPush = () => {
  if (!isPushConfigured()) return false

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY as string, VAPID_PRIVATE_KEY as string)
  return true
}

export const getVapidPublicKey = () => VAPID_PUBLIC_KEY || ''

export const savePushSubscription = async (subscription: PushSubscription, userEmail?: string | null) => {
  const db = await getDb()
  const collection = db.collection('push_subscriptions')

  await collection.createIndex({ endpoint: 1 }, { unique: true }).catch(() => undefined)
  await collection.updateOne(
    { endpoint: subscription.endpoint },
    {
      $set: {
        ...subscription,
        userEmail: userEmail || null,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  )
}

export const deletePushSubscription = async (endpoint: string) => {
  const db = await getDb()
  await db.collection('push_subscriptions').deleteOne({ endpoint })
}

export const sendPushToAll = async (payload: Record<string, unknown>) => {
  if (!configureWebPush()) {
    console.warn('Web Push nao configurado. Defina NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT.')
    return { sent: 0, failed: 0, skipped: true }
  }

  const db = await getDb()
  const collection = db.collection<PushSubscription & { endpoint: string }>('push_subscriptions')
  const subscriptions = await collection.find({}).toArray()

  let sent = 0
  let failed = 0

  await Promise.all(
    subscriptions.map(async subscription => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload))
        sent += 1
      } catch (error: any) {
        failed += 1
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await collection.deleteOne({ endpoint: subscription.endpoint })
        } else {
          console.warn('Falha ao enviar Web Push:', error?.message || error)
        }
      }
    }),
  )

  return { sent, failed, skipped: false }
}

export const notifyNewAIImages = async (
  collectionName: string,
  theme: string,
  items: Array<{ title?: string; url?: string }>,
) => {
  if (items.length === 0) return

  const moduleLabel = collectionName === 'images_sentences'
    ? 'frases'
    : collectionName === 'images_proverbs'
      ? 'ditados'
      : 'vocabulário'

  await sendPushToAll({
    title: 'Novas imagens em francês',
    body: `${items.length} novas imagens de ${moduleLabel} sobre ${theme} foram geradas pela IA.`,
    icon: '/icons/icon-192x192.png',
    image: items[0]?.url?.startsWith('http') ? items[0].url : undefined,
    tag: `ai-${collectionName}-${theme}`,
    url: collectionName === 'images' ? '/game' : collectionName === 'images_sentences' ? '/frases' : '/proverbs',
  })
}
