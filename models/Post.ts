import { ObjectId } from 'mongodb';

export interface Post {
  _id?: ObjectId;
  caption: string;
  imageUrl: string;
  videoUrl?: string;        // URL do vídeo gerado pelo Kling.ai (opcional)
  videoPrompt?: string;     // Prompt usado para gerar o vídeo
  videoDuration?: number;   // Duração em segundos (30–120)
  frenchNarration?: string; // Narração em francês que será lida em áudio quando o vídeo tocar
  theme: 'Gramática' | 'Cultura' | 'Gastronomia' | 'Tecnologia' | 'Ditados' | 'Natureza' | 'Turismo' | 'Pensamentos';
  startDate: Date;
  endDate: Date | null;
  likes: number;
  comments: Comment[];
  likedBy?: LikedUser[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LikedUser {
  userId: string;
  userName: string;
  userImage?: string;
}

export interface Comment {
  _id?: ObjectId;
  userId: string;
  userName: string;
  userImage?: string;
  text: string;
  createdAt: Date;
}
