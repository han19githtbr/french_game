import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'milliance23@gmail.com';

export const getApiSession = (req: NextApiRequest, res: NextApiResponse) =>
  getServerSession(req, res, authOptions);

export const requireApiSession = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getApiSession(req, res);

  if (!session?.user?.email) {
    res.status(401).json({ message: 'Autenticação necessária.' });
    return null;
  }

  return session;
};

export const requireAdminSession = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await requireApiSession(req, res);

  if (!session) return null;

  if (session.user.email !== ADMIN_EMAIL) {
    res.status(403).json({ message: 'Permissão de administrador necessária.' });
    return null;
  }

  return session;
};
