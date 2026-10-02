/**
 * Utilitários de imagem no navegador para a selfie com moldura (NEU-125).
 * Nada daqui fala com a rede: a foto fica no aparelho até a pessoa compartilhar.
 */

export function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Menu de compartilhar do celular com o arquivo (Stories, WhatsApp…); sem suporte, baixa. */
export async function shareOrDownload(blob: Blob, fileName: string): Promise<void> {
  const file = new File([blob], fileName, { type: blob.type || "image/png" });
  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "NeuroRace" });
    } catch (err) {
      // Fechar o menu de compartilhar não é erro.
      if ((err as { name?: string })?.name !== "AbortError") throw err;
    }
    return;
  }
  download(blob, fileName);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`não carregou ${src}`));
    img.src = src;
  });
}

/** Foto da galeria como imagem desenhável, já com a orientação do EXIF aplicada pelo navegador. */
export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
