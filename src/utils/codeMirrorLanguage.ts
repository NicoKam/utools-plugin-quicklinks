import type { Extension } from '@codemirror/state';
import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';

function descriptionFor(path: string) {
  return LanguageDescription.matchFilename(languages, path);
}

export function codeMirrorLanguageName(path: string) {
  return descriptionFor(path)?.name ?? 'Plain Text';
}

export async function loadCodeMirrorLanguage(path: string): Promise<Extension> {
  return await descriptionFor(path)?.load() ?? [];
}
