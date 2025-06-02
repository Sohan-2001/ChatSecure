'use server';

/**
 * @fileOverview AI-powered message moderation flow for detecting disrespectful, political, or violent content.
 *
 * - moderateMessage - A function that moderates a given message.
 * - ModerateMessageInput - The input type for the moderateMessage function.
 * - ModerateMessageOutput - The return type for the moderateMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModerateMessageInputSchema = z.object({
  message: z.string().describe('The chat message to be moderated.'),
});
export type ModerateMessageInput = z.infer<typeof ModerateMessageInputSchema>;

const ModerateMessageOutputSchema = z.object({
  isSafe: z
    .boolean()
    .describe(
      'True if the message is safe and does not contain disrespectful, political, or violent content; otherwise, false.'
    ),
  reason: z
    .string()
    .optional()
    .describe('The reason why the message was flagged as unsafe.'),
});
export type ModerateMessageOutput = z.infer<typeof ModerateMessageOutputSchema>;

export async function moderateMessage(input: ModerateMessageInput): Promise<ModerateMessageOutput> {
  return moderateMessageFlow(input);
}

const moderateMessagePrompt = ai.definePrompt({
  name: 'moderateMessagePrompt',
  input: {schema: ModerateMessageInputSchema},
  output: {schema: ModerateMessageOutputSchema},
  prompt: `You are an AI assistant tasked with moderating chat messages for a safe and positive chatting experience.

  Your task is to determine if the given message contains any disrespectful, political, or violent content.

  Based on your analysis, set the "isSafe" field to true if the message is safe; otherwise, set it to false and provide a reason in the "reason" field.

  Message: "{{message}}"

  Respond in JSON format.
`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  },
});

const moderateMessageFlow = ai.defineFlow(
  {
    name: 'moderateMessageFlow',
    inputSchema: ModerateMessageInputSchema,
    outputSchema: ModerateMessageOutputSchema,
  },
  async input => {
    const {output} = await moderateMessagePrompt(input);
    return output!;
  }
);
