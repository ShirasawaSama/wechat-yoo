import { createHash } from 'crypto'
import { XMLParser } from 'fast-xml-parser'
import {
  buildMessage, buildEncryptedMessage, MessageData, VideoMessage, MusicMessage,
  ReceivedEventMessage, ReceivedTextMessage, ReceivedImageMessage, ReceivedVideoMessage, ReceivedShortVideoMessage, ReceivedVoiceMessage, ReceivedLinkMessage, ReceivedLocationVideoMessage,
} from './messages.js'
import fs from 'fs/promises'
import WechatCrypto from './WechatCrypto.js'
import eventemitter2, { ConstructorOptions, OnOptions } from 'eventemitter2'

const { EventEmitter2 } = eventemitter2

const xmlParser = new XMLParser()
const receivedMessageTypes = ['text', 'image', 'voice', 'video', 'shortVideo', 'location', 'link', 'error', 'before', 'after', 'default'] as const
const receivedEventTypes = [
  'subscribe', 'unsubscribe', 'scan', /* 'location', */ // https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Receiving_event_pushes.html
  'click', 'view', 'scanCodePush', 'scanCodeWaitMsg', 'picSysPhoto', 'picPhotoOrAlbum', 'picWeixin', 'locationSelect', 'viewMiniProgram', // https://developers.weixin.qq.com/doc/offiaccount/Custom_Menus/Custom_Menu_Push_Events.html
  'shakeAroundUserShake', // https://developers.weixin.qq.com/doc/offiaccount/Shake_Nearby/Shake_Event_Notifications.html
  'qualificationVerifySuccess', 'qualificationVerifyFail', 'namingVerifySuccess', 'namingVerifyFail', 'annualRenew', // https://developers.weixin.qq.com/doc/offiaccount/Account_Management/Wechat_Accreditation_Event_Push.html
  'cardPassCheck', 'userGetCard', 'userGiftingCard', 'userDelCard', 'userConsumeCard', 'userPayFromPayCell', 'userViewCard', 'userEnterSessionFromCard',
    'updateMemberCard', 'cardSkuRemind', 'cardPayOrder', 'submitMemberCardUserInfo', // https://developers.weixin.qq.com/doc/offiaccount/Cards_and_Offer/Coupons_Vouchers_and_Cards_Event_Push_Messages.html
  'guideQRcodeScanEvent', // https://developers.weixin.qq.com/doc/offiaccount/Shopping_Guide/guide-account/shopping-guide.onGuideCreateQrCode.html
  'userAuthorizeInvoice', 'updateInvoiceStatus', // https://developers.weixin.qq.com/doc/offiaccount/WeChat_Invoice/Nontax_Bill/API_list.html
  'shakeAroundLotteryBind', // https://developers.weixin.qq.com/doc/offiaccount/Shake_Nearby/Shake_RedPack/Event_notifications_for_Red_Packet_Bind_users.html
  'userAuthorizationRevoke', // https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/authorization_change.html
  'templateSendJobFinish', // https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Template_Message_Interface.html
  'poiCheckNotify', // https://developers.weixin.qq.com/doc/offiaccount/WeChat_Stores/WeChat_Store_Interface.html
  'wifiConnected', // https://developers.weixin.qq.com/doc/offiaccount/WiFi_via_WeChat/Sending_messages_after_connection.html
  'userPayFromPayCell', // https://developers.weixin.qq.com/doc/offiaccount/Cards_and_Offer/Create_a_Coupon_Voucher_or_Card.html
  'giftCardPayDone', 'giftCardSendToFriend', 'giftCardUserAccept', // https://developers.weixin.qq.com/doc/offiaccount/Cards_and_Offer/gift_card.html
  'publishJobFinish', // https://developers.weixin.qq.com/doc/offiaccount/Publish/Callback_on_finish.html
  'addGuideBuyerRelationEvent', // https://developers.weixin.qq.com/doc/offiaccount/Shopping_Guide/buyer-account/shopping-guide.addGuideBuyerRelation.html
  'guideInviteResultEven', // https://developers.weixin.qq.com/doc/offiaccount/Shopping_Guide/guide-account/shopping-guide.addGuideAcct.html
  'massSendJobFinish', // https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Batch_Sends_and_Originality_Checks.html
  'updateInvoiceStatus', // https://developers.weixin.qq.com/doc/offiaccount/WeChat_Invoice/E_Invoice/Invoicing_Platform_API_List.html
] as const

const typeNameMap: Record<string, string> = { }
;(receivedMessageTypes as unknown as string[]).concat(receivedEventTypes).forEach(type => (typeNameMap[type] = type.toLowerCase()))

class Sender {
  public replyData: MessageData | null = null

  public reply (data: MessageData) {
    this.replyData = data
    return this
  }

  public text (content: string | number | boolean | bigint) {
    this.replyData = typeof content === 'object' ? content : { type: 'text', content }
    return this
  }

  public image (imageId: string) {
    this.replyData = typeof imageId === 'object' ? imageId : { type: 'image', imageId }
    return this
  }

  public voice (voiceId: string) {
    this.replyData = typeof voiceId === 'object' ? voiceId : { type: 'voice', voiceId }
    return this
  }

  public video (data: Omit<VideoMessage, 'type'>): this
  public video (videoId: string, title?: string, description?: string): this
  public video (videoId: string | Omit<VideoMessage, 'type'>, title?: string, description?: string) {
    this.replyData = typeof videoId === 'object' ? { type: 'video', ...videoId } : { type: 'video', videoId, title, description }
    return this
  }

  public music (data: Omit<MusicMessage, 'type'>): this
  public music (musicUrl: string, thumbMediaId: string, hqMusicUrl?: string, title?: string, description?: string): this
  public music (musicUrl: string | Omit<MusicMessage, 'type'>, thumbMediaId?: string, hqMusicUrl?: string, title?: string, description?: string) {
    this.replyData = typeof musicUrl === 'object' ? { type: 'music', ...musicUrl } : { type: 'music', musicUrl, hqMusicUrl, thumbMediaId, title, description } as any
    return this
  }

  public news (articles: { title: string, description: string, picUrl: string, url: string }[]) {
    this.replyData = { type: 'news', articles }
    return this
  }

  public transferCustomerService (account?: string) {
    this.replyData = { type: 'transfer_customer_service', account }
    return this
  }
}

export interface Request {
  method?: string
}

export interface Context {
  req: Request
  query?: any
}

export interface Options {
  token: string
  key?: string
  id?: string
  secret?: string
  autoFetchAccessToken?: boolean
  accessTokenCacheFile?: string
}

export type ExtendFunction <M, T> = (listener: (sender: Sender, message: M, type: T) => void) => Yoo
export type ExtendFunctions = {
  text: ExtendFunction<ReceivedTextMessage, 'text'>
  image: ExtendFunction<ReceivedImageMessage, 'image'>
  voice: ExtendFunction<ReceivedVoiceMessage, 'voice'>
  video: ExtendFunction<ReceivedVideoMessage, 'video'>
  shortVideo: ExtendFunction<ReceivedShortVideoMessage, 'shortVideo'>
  location: ExtendFunction<ReceivedLocationVideoMessage, 'location'>
  link: ExtendFunction<ReceivedLinkMessage, 'link'>
  error: (listener: (sender: Sender, message: any, error: Error) => void) => Yoo
  before: (listener: (sender: Sender, message: any, type: string) => void) => Yoo
  after: (listener: (sender: Sender, message: any, type: string) => void) => Yoo
  default: (listener: (sender: Sender, message: any, type: string) => void) => Yoo
} & { [K in typeof receivedEventTypes[number]]: ExtendFunction<ReceivedEventMessage, K> }

class Yoo <S = any> extends EventEmitter2 {
  private readonly options: Options
  private readonly crypto: WechatCrypto | null
  public accessToken: string = ''

  public constructor (options: string | (Options & ConstructorOptions)) {
    const optionsObj = typeof options === 'string' ? { token: options } : options as Options
    super({ maxListeners: 0, ...optionsObj })
    this.options = optionsObj
    this.crypto = optionsObj.key && optionsObj.id ? new WechatCrypto(optionsObj.token, optionsObj.key, optionsObj.id) : null

    Object.values(typeNameMap).forEach(it => ((this as any)[it] = (listener: (sender: Sender, message: any, type: any) => void) => this.on(it, listener)))

    if (optionsObj.autoFetchAccessToken && this.options.id && this.options.secret) this.fetchAccessToken()
  }

  private emitWithTimeout (event: string, sender: Sender, data: any, type: string) {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Process wechat events timeout!')), 4700)
      this.emitAsync(event, sender, data, type).then(() => {
        clearTimeout(timer)
        resolve()
      }, reject)
    })
  }

  public callback() {
    return async (method: string, query: { [key: string]: string | string[] | undefined; }, data: string | any) => {
      if (method === 'GET' && query && query.signature && query.timestamp && query.nonce && query.echostr) {
        if (this.crypto) {
          if (query.signature === this.crypto.getSignature(query.timestamp as string, query.nonce as string, query.echostr as string)) {
            return { status: 200, body: this.crypto.decrypt(query.echostr as string).message }
          }
        } else if (createHash('sha1').update([this.options.token, query.timestamp, query.nonce].sort().join('')).digest('hex') === query.signature) {
          return { status: 200, body: query.echostr as string }
        }
        return { status: 401, body: 'Invalid signature' }
      } else if (method === 'POST') {
        if (typeof data === 'string') data = xmlParser.parse(data)
        if (this.crypto && data.Encrypt && query && query.timestamp && query.nonce && query.msg_signature) {
          const encrypt = data.Encrypt[0]
          if (query.msg_signature !== this.crypto.getSignature(query.timestamp as string, query.nonce as string, encrypt)) {
            return { status: 401, body: 'Invalid signature' }
          }
          data = xmlParser.parse(this.crypto.decrypt(encrypt).message)
        }
        if (data.xml) data = data.xml

        if (!data || !data.MsgType || !data.FromUserName || !data.FromUserName) return { status: 400, body: 'Bad Request' }

        let type = data.MsgType
        const sender = new Sender()
        try {
          if (type === 'event' && data.Event) type = data.Event
          type = type.toLowerCase().replace(/_/g, '')
          if (typeNameMap[type]) type = typeNameMap[type]
          if (this.listenerCount('before') > 0) await this.emitWithTimeout('before', sender, data, type)
          if (this.listenerCount(type) > 0) await this.emitWithTimeout(type, sender, data, type)
          if (!sender.replyData && this.listenerCount('default') > 0) await this.emitWithTimeout('default', sender, data, type)
        } catch (e) {
          if (this.listenerCount('error') > 0) await this.emitAsync('error', sender, data, e)
          else throw e
          if (!sender.replyData) return { status: 500, body: 'Internal Server Error' }
        } finally {
          if (this.listenerCount('after') > 0) await this.emitWithTimeout('after', sender, data, type)
        }
        
        if (sender.replyData) {
          const body = buildMessage(data.FromUserName, data.ToUserName, data.CreateTime, sender.replyData)
          return {
            status: 200,
            body: this.crypto && query && query.timestamp && query.nonce && query.msg_signature
              ? buildEncryptedMessage(this.crypto.encrypt(body), query.msg_signature as string, query.timestamp as string, query.nonce as string)
              : body
          }
        }
        return {
          status: 200,
          body: 'success'
        }
      }
    }
  }

  async fetchAccessToken (readFromCache = true) {
    if (readFromCache) {
      try {
        const cache = JSON.parse(await fs.readFile(this.options.accessTokenCacheFile || '.yoo-access-token.json', 'utf-8'))
        if (cache && cache.accessToken && cache.expiresAt && cache.expiresAt > Date.now() + 1000 * 60) {
          this.emit('fetchAccessToken', cache.accessToken, cache.expiresAt)
          this.accessToken = cache.accessToken
          setTimeout(() => this.fetchAccessToken(false), Math.max(cache.expiresAt - Date.now() - 1000 * 60, 0))
          return
        }
      } catch { }
    }
    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.options.id}&secret=${this.options.secret}`).then(it => it.json())
    if (!res.access_token) return
    this.emit('fetchAccessToken', res.access_token, res.expiresAt)
    this.accessToken = res.access_token
    try {
      await fs.writeFile(this.options.accessTokenCacheFile || '.yoo-access-token.json', JSON.stringify({
        accessToken: res.access_token,
        expiresAt: Date.now() + res.expires_in * 1000
      }))
    } catch { }
    setTimeout(() => this.fetchAccessToken(false), (res.expires_in - 60) * 1000)
  }

  on (event: 'fetchAccessToken', listener: (accessToken: string, expiresIn: number) => void, options?: boolean | OnOptions): this
  // @ts-ignore
  on <E extends keyof ExtendFunctions> (event: E | string | symbol | (E | string | symbol)[], listener: Parameters<ExtendFunctions[E]>[0], options?: boolean | OnOptions): this
  // @ts-ignore
  off <E extends keyof ExtendFunctions> (event: E | string | symbol | (E | string | symbol)[], listener: Parameters<ExtendFunctions[E]>[0], options?: boolean | OnOptions): this
}

interface Yoo extends ExtendFunctions { }

export default Yoo
