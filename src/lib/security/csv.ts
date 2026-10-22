/** Escapes delimiters and prevents spreadsheet formula injection in CSV exports. */
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  // Spreadsheet applications may ignore leading whitespace when detecting formulae.
  if (/^[\s\u0000-\u001f]*[=+@-]/u.test(text)) text = "'" + text;
  const escaped = text.replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? '"' + escaped + '"' : escaped;
}
