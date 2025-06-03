import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tipos para tratamento seguro de erros
type CloudinaryError = {
  message: string;
  error?: {
    message: string;
  };
};

export async function uploadImage(file: File): Promise<string> {
  // Validação inicial
  if (!file) throw new Error('Nenhum arquivo fornecido');
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Configuração do Cloudinary não encontrada');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'french_game'); // Pasta específica

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData: CloudinaryError = await response.json();
      throw new Error(errorData.error?.message || 'Erro ao fazer upload da imagem');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Erro detalhado no upload:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Falha ao processar upload da imagem'
    );
  }
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    return isNaN(d.getTime()) 
      ? '' 
      : d.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  } catch {
    return '';
  }
}

// Versão melhorada da função cn (combina clsx + tailwind-merge)
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}