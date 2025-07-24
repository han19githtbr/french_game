import { ObjectId } from 'mongodb';

export interface Post {
  _id?: ObjectId;
  caption: string;
  imageUrl: string;
  theme: 'Gramática' | 'Cultura' | 'Gastronomia' | 'Tecnologia' | 'Ditados' | 'Natureza' | 'Turismo' | 'Pensamentos';
  startDate: Date;
  endDate: Date | null; // null significa publicação permanente
  likes: number;
  views: number;
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  _id?: ObjectId;
  userId: string;
  userName: string;
  userImage?: string;
  text: string;
  createdAt: Date;
}