declare module 'shelljs' {
  export function which(cmd: string): string | null;
}
