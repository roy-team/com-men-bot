import { Context, Telegraf } from 'telegraf'

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

  initConversation(userId: number, tag: string) {
    this.conversations[userId] = {
      tag,
      step: 0,
      context: [],
    }
  }

  hasConversation(userId: number) {
    return this.conversations[userId]
  }

  stopConversation(userId: number) {
    delete this.conversations[userId]
  }

  addConversationContext(userId: number, data: string) {
    if (this.conversations[userId]) {
      this.conversations[userId].context[this.conversations[userId].step++] = data
    }
  }
}