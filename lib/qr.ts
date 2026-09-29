import QRCode from "qrcode";

/**
 * QR em SVG, gerado no servidor (só o page.tsx chama): a lib não vai para o bundle do browser.
 * Módulos escuros sobre fundo claro (leitores de celular erram menos assim).
 */
export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#0a0e13", light: "#eef6f3" },
  });
}
