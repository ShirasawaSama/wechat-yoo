import { createHash, createDecipheriv, randomBytes, createCipheriv } from 'crypto'

export const encodePKCS7 = (data: Buffer) => {
  const len = 32 - (data.length % 32)
  return Buffer.concat([data, Buffer.alloc(len, len)]);
}

export const decodePKCS7 = (data: Buffer) => {
  let pad = data[data.length - 1]
  if (pad < 1 || pad > 32) pad = 0
  return data.subarray(0, data.length - pad)
}

export default class WechatCrypto {
  private readonly token: string
  private readonly appId: Buffer
  private readonly key: Buffer
  private readonly iv: Buffer

  constructor(token: string, encodingAESKey: string, appId: string) {
    this.token = token
    this.appId = Buffer.from(appId)

    this.key = Buffer.from(encodingAESKey + '=', 'base64')
    if (this.key.length !== 32) throw new Error('Invalid encodingAESKey.')
    this.iv = this.key.subarray(0, 16);
  }

  public getSignature(timestamp: string, nonce: string, encrypt: string): string {
    return createHash('sha1').update([this.token, timestamp, nonce, encrypt].sort().join('')).digest('hex')
  }

  public decrypt(data: string) {
    const decipher = createDecipheriv('aes-256-cbc', this.key, this.iv);
    decipher.setAutoPadding(false);
    const deciphered = decodePKCS7(Buffer.concat([decipher.update(data, 'base64'), decipher.final()]));

    const content = deciphered.subarray(16)
    const length = content.readUInt32BE()

    return {
      message: content.subarray(4, length + 4).toString(),
      id: content.subarray(length + 4).toString()
    }
  }

  public encrypt(data: string): string {
    const randomString = randomBytes(16)
    const msg = Buffer.from(data);
    const msgLength = Buffer.allocUnsafe(4)
    msgLength.writeUInt32BE(msg.length, 0)
    const cipher = createCipheriv('aes-256-cbc', this.key, this.iv);
    cipher.setAutoPadding(false)
    return Buffer.concat([cipher.update(encodePKCS7(Buffer.concat([randomString, msgLength, msg, this.appId]))), cipher.final()]).toString('base64')
  }
}
