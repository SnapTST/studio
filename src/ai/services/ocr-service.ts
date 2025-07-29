'use server';

import { ocrImage } from '@/ai/flows/ocr-image';

/**
 * Extracts text from an image using the ocrImage flow.
 * @param photoDataUri The data URI of the image to process.
 * @returns The extracted text.
 */
export async function extractTextFromImage(photoDataUri: string): Promise<string> {
  const result = await ocrImage({ photoDataUri });
  return result.text;
}
