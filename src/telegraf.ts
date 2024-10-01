import { Context, Telegraf } from 'telegraf'
import { Update } from 'telegraf/types'

export type TConversationData = {
  tag: string
  step: number
  context: string[]
}

export class MyTelegraf<C extends Context = Context> extends Telegraf {
  private conversations: Record<number, TConversationData> = {}

  constructor(token: string, options?: Partial<Telegraf.Options<C>>) {
    super(token, options)
  }

  initConversation(ctx: Context<Update.MessageUpdate>, tag: string) {
    this.conversations[ctx.from.id] = {
      tag,
      step: 0,
      context: [],
    }
  }

  hasConversation(userId: number) {
    return this.conversations[userId]
  }

  addConversationContext(userId: number, data: string) {
    if (this.conversations[userId]) {
      this.conversations[userId].context[this.conversations[userId].step++] = data
    }
  }
}