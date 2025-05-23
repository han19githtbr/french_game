import NextAuth, { AuthOptions, User, Account, Profile, Session } from 'next-auth'
import GoogleProvider, { GoogleProfile } from 'next-auth/providers/google'
import { JWT } from 'next-auth/jwt';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: { // <--- ADICIONE ESTA SEÇÃO DE CALLBACKS
    async jwt({ token, user, account, profile, trigger, isNewUser, session: nextAuthSession }) {
      
      console.log('JWT Callback - user:', user); // Para debug no terminal
      console.log('JWT Callback - token ANTES:', token);
      
      // O objeto 'user' aqui vem do provedor (Google) e já deve ter o 'id'
      if (user?.id) {
        token.id = user.id; // Adiciona o ID do usuário ao token JWT
      } else if (profile && (profile as GoogleProfile).sub) {
        // Fallback: se user.id não for preenchido por algum motivo, use profile.sub
        token.id = (profile as GoogleProfile).sub;
      } else {
        // Se, por algum motivo, o ID não for encontrado aqui, logue um aviso.
        // É crucial que o token.id tenha um valor para a próxima etapa.
        console.warn('JWT Callback: ID do usuário não encontrado em user.id ou profile.sub. Token.id pode ser undefined.');
      }
      console.log('JWT Callback - token:', token); // Para debug no terminal
      return token;
    },
    async session({ session, token, user }) {
      
      console.log('Session Callback - user (from DB/Provider):', user); // Debug
      console.log('Session Callback - token (JWT):', token); // Debug
      console.log('Session Callback - session ANTES:', session); // Debug
      
      // *** CORREÇÃO DEFINITIVA AQUI ***
      // Atribua session.user.id APENAS se token.id for uma string válida.
      // Se token.id não for uma string, isso é um erro na configuração do NextAuth
      // ou um problema com o provedor que não está retornando o ID.
      if (typeof token.id === 'string') {
        session.user.id = token.id; // Atribuição que o TypeScript aceita
      } else {
        // Este 'else' agora lida com um cenário de ERRO.
        // Se chegarmos aqui, significa que o ID não foi corretamente injetado no token JWT.
        // Você PODE querer forçar um erro ou redirecionar o usuário,
        // pois sem um ID de usuário, o chat não funcionará.
        console.error('ERRO CRÍTICO: ID do usuário não é uma string válida no token JWT. Não foi possível atribuir session.user.id.');
        // Opcional: Se você realmente precisar de um valor, pode tentar um fallback
        // mas o ideal é que token.id esteja preenchido.
        // session.user.id = 'fallback-id-error'; // Apenas para debug ou caso extremo
      }

      console.log('Session Callback - session DEPOIS (com ID?):', session); // Debug
      console.log('Session Callback - session.user.id:', session.user.id); // Para debug no terminal
      
      return session;
    },
  },
}

export default NextAuth(authOptions)
