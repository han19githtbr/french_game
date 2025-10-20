import { ObjectId } from 'mongodb';

export interface Post {
  _id?: ObjectId;
  caption: string;
  imageUrl: string;
  theme: 'Gramática' | 'Cultura' | 'Gastronomia' | 'Tecnologia' | 'Ditados' | 'Natureza' | 'Turismo' | 'Pensamentos';
  startDate: Date;
  endDate: Date | null; // null significa publicação permanente
  likes: number;
  views: 0;
  comments: Comment[];
  likedBy?: LikedUser[]; // Lista de usuários que curtiram
  viewedBy?: string[]; // Lista de userIds que visualizaram
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