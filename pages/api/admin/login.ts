import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email } = req.body;

    // Verifique se o e-mail corresponde ao seu e-mail de administrador
    if (email === process.env.ADMIN_EMAIL) {
      // Se a autorização for bem-sucedida, retorne um status de sucesso
      return res.status(200).json({ success: true, message: 'Administrador autorizado' });
    } else {
      // Se o e-mail não corresponder, retorne um status de não autorizado
      return res.status(401).json({ success: false, message: 'Acesso não autorizado' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}