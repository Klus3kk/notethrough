export function cn(...inputs: Array<string | undefined | false | null>) {
  return inputs.filter(Boolean).join(" ");
}

export function formatDouble(value: number) {
  return value.toFixed(1);
}
