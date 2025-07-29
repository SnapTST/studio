'use server';

/**
 * @fileOverview Generates a test paper from an image of text using OCR and a language model.
 *
 * - generateTestPaper - A function that handles the test paper generation process.
 * - GenerateTestPaperInput - The input type for the generateTestPaper function.
 * - GenerateTestPaperOutput - The return type for the generateTestPaper function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { extractTextFromImage } from '@/ai/services/ocr-service';

const GenerateTestPaperInputSchema = z.object({
  photoDataUris: z
    .array(z.string())
    .describe(
      "A photo of a textbook page, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  marks: z.number().describe('The number of marks the test paper should be worth.'),
  examFormat: z.string().optional().describe('Instructions on the format of the exam paper.'),
  questionTypes: z.array(z.string()).optional().describe('A list of question types to include.'),
});
export type GenerateTestPaperInput = z.infer<typeof GenerateTestPaperInputSchema>;

const GenerateTestPaperOutputSchema = z.object({
  testPaper: z.string().describe('The generated test paper.'),
});
export type GenerateTestPaperOutput = z.infer<typeof GenerateTestPaperOutputSchema>;

export async function generateTestPaper(input: GenerateTestPaperInput): Promise<GenerateTestPaperOutput> {
  return generateTestPaperFlow(input);
}

const generateTestPaperPrompt = ai.definePrompt({
  name: 'generateTestPaperPrompt',
  input: {schema: z.object({
    extractedText: z.string(),
    marks: z.number(),
    examFormat: z.string().optional(),
    questionTypes: z.array(z.string()).optional(),
  })},
  output: {schema: GenerateTestPaperOutputSchema},
  prompt: `You are an expert educator, skilled in creating effective test papers.

  Based on the provided text, create a test paper with questions that assess the student's understanding of the material.
  The test paper should be worth a total of {{marks}} marks. Structure the test paper in a way that the marks are appropriately distributed to each question.

  Text: {{{extractedText}}}
  Marks: {{{marks}}}
  
  {{#if examFormat}}
  Please follow these formatting instructions:
  {{{examFormat}}}
  {{/if}}

  {{#if questionTypes}}
  Ensure the test paper includes a variety of the following question types:
  {{#each questionTypes}}
  - {{this}}
  {{/each}}
  {{else}}
  Ensure the test paper is well-formatted and includes a variety of question types, such as multiple choice, short answer, and essay questions.
  {{/if}}

  Your response should only include the test paper. Do not include any additional information or explanation.
  `,
});

const generateTestPaperFlow = ai.defineFlow(
  {
    name: 'generateTestPaperFlow',
    inputSchema: GenerateTestPaperInputSchema,
    outputSchema: GenerateTestPaperOutputSchema,
  },
  async input => {
    const extractedTexts = await Promise.all(
      input.photoDataUris.map(uri => extractTextFromImage(uri))
    );
    const extractedText = extractedTexts.join('\n\n');


    const {output} = await generateTestPaperPrompt({
      extractedText,
      marks: input.marks,
      examFormat: input.examFormat,
      questionTypes: input.questionTypes,
    });
    return output!;
  }
);
