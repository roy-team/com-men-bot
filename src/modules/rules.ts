import Module, { TextContext } from '@src/module.js'
import { getSetting, setSetting } from '@src/telegram.js'
import { TConversationData } from '@src/telegraf.js'

export default class extends Module {
  conversationTags = ['set-rules']

  setup() {
    this.commands.rules = {
      title: 'Правила',
      access: ['privateAll', 'groupAll'],
      addToList: 10,
      func: async (ctx) => {
        void ctx.reply(await getSetting('rules') ?? 'Правила группы еще не установлены')
      }
    }

    this.commands.setRules = {
      title: 'Установить правила группы',
      access: ['privateAdmin'],
      func: (ctx) => {
        void ctx.reply('Для изменения списка правил отправьте этот список одним сообщением.\nВы можете отменить изменение правил используя команду /stop')
        this.bot.initConversation(ctx.from.id, 'set-rules')
      }
    }
  }

  onConversation(ctx: TextContext, conversation: TConversationData) {
    void setSetting('rules', ctx.message.text)
    this.bot.stopConversation(ctx.from.id)
    void ctx.reply('Новые правила сохранены')
  }
}