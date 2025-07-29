'use server';

/**
 * @fileOverview An OCR image AI agent.
 *
 * - ocrImage - A function that handles the OCR image process.
 * - OcrImageInput - The input type for the ocrImage function.
 * - OcrImageOutput - The return type for the ocrImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OcrImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to extract text from, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type OcrImageInput = z.infer<typeof OcrImageInputSchema>;

const OcrImageOutputSchema = z.object({
  text: z.string().describe('The extracted text from the image.'),
});
export type OcrImageOutput = z.infer<typeof OcrImageOutputSchema>;

export async function ocrImage(input: OcrImageInput): Promise<OcrImageOutput> {
  return ocrImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'ocrImagePrompt',
  input: {schema: OcrImageInputSchema},
  output: {schema: OcrImageOutputSchema},
  prompt: `Extract all the text from the following image.

{{media url=photoDataUri}}`,
});

const ocrImageFlow = ai.defineFlow(
  {
    name: 'ocrImageFlow',
    inputSchema: OcrImageInputSchema,
    outputSchema: OcrImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
