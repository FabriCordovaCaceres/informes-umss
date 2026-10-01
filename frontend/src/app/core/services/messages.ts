export function errorMessage(error: unknown): string {
  const e = error as { status?: number; error?: { message?: string; errors?: string[] } };
  return e.status === 0
    ? 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.'
    : (e.error?.message ?? 'No se pudo completar la operación. Intente nuevamente.');
}
export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
