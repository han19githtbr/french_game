// next-auth.d.ts
import NextAuth, { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt'; // Importe JWT se você usa tokens

declare module 'next-auth' {
  /**
   * Extenda a interface 'Session' do next-auth para incluir suas propriedades personalizadas.
   */
  interface Session {
    user: {
      id: string; // Adicione a propriedade 'id' aqui para o objeto 'user' dentro da sessão
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } & DefaultSession['user']; // Mantenha as propriedades padrão do NextAuth
    isAdmin?: boolean; // Sua propriedade 'isAdmin' existente
  }

  /**
   * Extenda a interface 'User' do next-auth.
   * Esta interface representa o objeto 'user' que é passado para as callbacks.
   */
  interface User {
    id: string; // Adicione a propriedade 'id' aqui
    // Você pode adicionar outras propriedades que seu objeto 'User' do banco de dados/provedor possa ter
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extenda a interface 'JWT' para incluir propriedades personalizadas no token.
   * Isso é crucial se você armazena o 'id' do usuário no token JWT.
   */
  interface JWT {
    id?: string; // Adicione a propriedade 'id' aqui
  }
}