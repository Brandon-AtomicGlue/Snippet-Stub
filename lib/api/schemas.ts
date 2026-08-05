import { z } from "zod";
import { LANGUAGES } from "@/lib/languages";
import { MAX_IMAGES_PER_SNIPPET } from "@/lib/image-limits";

export const MAX_CODE_LENGTH = 200_000;
export const MAX_NOTES_LENGTH = 4000;

const languageValues = LANGUAGES.map((l) => l.value) as [string, ...string[]];

export const createSnippetSchema = z.object({
  language: z.enum(languageValues),
  code: z.string().min(1, "Code can't be empty").max(MAX_CODE_LENGTH, "Snippet is too large"),
  notes: z.string().max(MAX_NOTES_LENGTH, "Notes are too long").nullable().optional(),
  expiration: z.enum(["1d", "7d", "30d"]),
  images: z
    .array(
      z.object({
        // data URL, e.g. "data:image/png;base64,...."
        dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
    )
    .max(MAX_IMAGES_PER_SNIPPET, `At most ${MAX_IMAGES_PER_SNIPPET} images`)
    .optional(),
});

export type CreateSnippetBody = z.infer<typeof createSnippetSchema>;

export const revokeSnippetSchema = z.object({
  ownerToken: z.string().min(1),
});
