import NextAuth, { Session } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      // O nome do provider que você usará na função signIn()
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' }, // Define o campo 'email' como credencial
      },
      async authorize(credentials) {
        if (credentials?.email === process.env.ADMIN_EMAIL) {
          // Simule um objeto de usuário para o next-auth
          return { id: 'admin', email: credentials?.email, name: 'Administrador' };
        }
        return null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }: { session: Session; token: any }) {
      if (session?.user?.email === process.env.ADMIN_EMAIL) {
        session.isAdmin = true; // Adiciona a propriedade isAdmin à sessão se o email corresponder
      }
      return session;
    },
  },
  pages: {
    signIn: '/', // Redireciona para a página de login em caso de falha (opcional)
  },
}

export default NextAuth(authOptions)