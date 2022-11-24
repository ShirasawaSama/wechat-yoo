const messages = {
  text: ({ content }: TextMessage) => `<Content><![CDATA[${content}]]></Content>`,
  image: ({ imageId }: ImageMessage) => `<Image><MediaId><![CDATA[${imageId}]]></MediaId></Image>`,
  voice: ({ voiceId }: VoiceMessage) => `<Voice><MediaId><![CDATA[${voiceId}]]></MediaId></Voice>`,
  video: ({ videoId, title, description }: VideoMessage) => `<Video>
    <MediaId><![CDATA[${videoId}]]></MediaId>
    ${title ? `<Title><![CDATA[${title}]]></Title>` : ''}
    ${description ? `<Description><![CDATA[${description}]]></Description>` : ''}
  </Video>`,
  music: ({ musicUrl, hqMusicUrl, thumbMediaId, title, description }: MusicMessage) => `<Music>
    <ThumbMediaId><![CDATA[${thumbMediaId}]]></ThumbMediaId>
    ${musicUrl ? `<MusicUrl><![CDATA[${musicUrl}]]></MusicUrl>` : ''}
    ${hqMusicUrl ? `<HQMusicUrl><![CDATA[${hqMusicUrl}]]></HQMusicUrl>` : ''}
    ${title ? `<Title><![CDATA[${title}]]></Title>` : ''}
    ${description ? `<Description><![CDATA[${description}]]></Description>` : ''}
  </Music>`,
  news: ({ articles }: NewsMessage) => `<ArticleCount>${articles.length}</ArticleCount>
  <Articles>
    ${articles.map(({ title, description, picUrl, url }) => `<item>
      <Title><![CDATA[${title}]]></Title>
      <Description><![CDATA[${description}]]></Description>
      <PicUrl><![CDATA[${picUrl}]]></PicUrl>
      <Url><![CDATA[${url}]]></Url>
    </item>`).join('')}
  </Articles>`,
  transfer_customer_service: ({ account }: TransferCustomerServiceMessage) => account ? `<TransInfo><KfAccount><![CDATA[${account}]]></KfAccount></TransInfo>` : ''
}

export const buildMessage = (to: string, from: string, time: string, data: MessageData) => `<xml>
  <ToUserName><![CDATA[${to}]]></ToUserName>
  <FromUserName><![CDATA[${from}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[${data.type}]]></MsgType>
  ${messages[data.type](data as any)}
</xml>`

export interface TextMessage {
  type: 'text'
  content: string | number | boolean | bigint
}
export interface ImageMessage {
  type: 'image'
  imageId: string
}
export interface VoiceMessage {
  type: 'voice'
  voiceId: string
}
export interface VideoMessage {
  type: 'video'
  videoId: string
  title?: string
  description?: string
}
export interface MusicMessage {
  type: 'music'
  thumbMediaId: string
  musicUrl?: string
  hqMusicUrl?: string
  title?: string
  description?: string
}
export interface NewsMessage {
  type: 'news'
  articles: {
    title: string
    description: string
    picUrl: string
    url: string
  }[]
}
export interface TransferCustomerServiceMessage {
  type: 'transfer_customer_service',
  account?: string
}
export type MessageData = TextMessage | ImageMessage | VoiceMessage | VideoMessage | MusicMessage | NewsMessage | TransferCustomerServiceMessage

export const buildEncryptedMessage = (encrypt: string, signature: string, time: string, nonce: string) => `<xml>
  <Encrypt><![CDATA[${encrypt}]]></Encrypt>
  <MsgSignature><![CDATA[${signature}]]></MsgSignature>
  <TimeStamp>${time}</TimeStamp>
  <Nonce><![CDATA[${nonce}]]></Nonce>
</xml>`

export interface ReceivedBaseMessage<T extends string> {
  ToUserName: string
  FromUserName: string
  CreateTime: number
  MsgType: T
}
export interface ReceivedMessage<T extends string> extends ReceivedBaseMessage<T> {
  MsgId: number
  MsgDataId?: string
  Idx?: number
}
export interface ReceivedTextMessage extends ReceivedMessage<'text'> {
  Content: string
}
export interface ReceivedImageMessage extends ReceivedMessage<'image'> {
  PicUrl: string
  MediaId: string
}
export interface ReceivedVoiceMessage extends ReceivedMessage<'voice'> {
  MediaId: string
  Format: string
}
export interface ReceivedVideoMessage extends ReceivedMessage<'video'> {
  MediaId: string
  ThumbMediaId: string
}
export interface ReceivedShortVideoMessage extends ReceivedMessage<'shortvideo'> {
  MediaId: string
  ThumbMediaId: string
}
export interface ReceivedLocationVideoMessage extends ReceivedMessage<'location'> {
  Location_X: number
  Location_Y: number
  Scale: number
  Label: string
}
export interface ReceivedLinkMessage extends ReceivedMessage<'link'> {
  Title: string
  Description: string
  Url: string
}
export interface ReceivedEventMessage extends ReceivedBaseMessage<'event'> {
  [key: string]: string | number
}
