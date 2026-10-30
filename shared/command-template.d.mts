export interface CommandContext { path: string; line?: number; column?: number; label?: string }
export function buildCommand(template: string, context: CommandContext): { executable: string; args: string[] };
export function validateTemplate(template: string): void;
