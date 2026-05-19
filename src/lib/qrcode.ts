import QRCode from "qrcode"

export function generateQRCodeDataURL(url: string) {
  return QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 1, width: 320 })
}
