declare module 'qrcode' {
  interface QRCodeOptions {
    width?: number
    margin?: number
    color?: {
      dark?: string
      light?: string
    }
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  }
  
  const QRCode: {
    toDataURL(text: string, options?: QRCodeOptions): Promise<string>
    toString(text: string, options?: QRCodeOptions): Promise<string>
    toCanvas(canvas: HTMLCanvasElement, text: string, options?: QRCodeOptions): Promise<void>
  }
  
  export default QRCode
}
