/**
 * Система жалоб на пользователей чата
 */
import Module, { CommandContext, getUsername, isGroupMember, TextContext } from '@src/module.js'
import { getRegisterOptions } from '@src/modules/register.js'
import { TConversationData } from '@src/telegraf.js'

// noinspection JSUnusedGlobalSymbols
export default class extends Module {
  conversationTags = ['complaint']

  setup() {
    this.commands.complaint = {
      title: 'Отправка жалобы',
      description: 'Пожаловаться на конкретное сообщение можно ответом на это сообщение',
      access: ['privateAll', 'groupAll'],
      addToList: 30,
      func: async (ctx: CommandContext) => {
        const data = await getRegisterOptions()
        let forwardMessage

        // На всякий случай проверить, была ли регистрация чата
        if (data.superAdminId && data.groupId) {
          // Является ли автор жалобы членом группы, если запрос был в приватном чате
          if (ctx.chat.type === 'private' && !(await isGroupMember(this.bot, data.groupId, ctx.from.id))) {
            return
          }

          // Начать опрос по сути жалобы
          void ctx.telegram.sendMessage(ctx.from.id, 'Опишите коротко суть жалобы\n(Пожалуйста, укажите конкретные детали инцидента, которые вызвали вашу жалобу)\nВы можете прервать опрос используя команду /stop')
          this.bot.initConversation(ctx, 'complaint')

          // Сохранить ID сообщения, на которое была жалоба, если было отмечено
          this.bot.addConversationContext(ctx.from.id, (ctx.message.reply_to_message ? ctx.message.reply_to_message.message_id : 0).toString())
        }
      }
    }
  }

  onConversation(ctx: TextContext, conversation: TConversationData) {
    this.bot.addConversationContext(ctx.from.id, ctx.message.text)

    switch (conversation.step) {
      case 2:
        void ctx.reply('Если это нарушает правила сообщества, то укажите, какие:\n(Выберите один или несколько вариантов, которые, по вашему мнению, были нарушены)\n' +
                       [
                         'Уважение к участникам',
                         'Запрет на споры на религиозные и политические темы',
                         'Запрет на рекламные публикации',
                         'Защита личной информации',
                         'Соблюдение темы чата',
                         'Модерация и санкции',
                         'Либо напишите свой вариант',
                       ].join('\n'))
        break
      case 3:
        void ctx.reply('Какие, на ваш взгляд, нужно принять решения, чтобы улучшить ситуацию?\n(Поделитесь своими предложениями по решению конфликта или улучшению правил сообщества)')
        break
      case 4:
        void ctx.reply('Жалоба зафиксирована и будет направлена администратору')

        getRegisterOptions()
          .then(async (data) => {
            // На всякий случай проверить, была ли регистрация чата
            if (data.superAdminId && data.groupId) {
              let forwardMessage
              const messageId = parseInt(conversation.context.shift() ?? '0')

              // Переслать администратору сообщение, на которое была жалоба, если было отмечено
              if (messageId) {
                forwardMessage = await ctx.telegram.forwardMessage(
                  data.superAdminId,
                  data.groupId,
                  messageId,
                )
              }

              // Отправить администратору информацию об авторе жалобы
              await ctx.telegram.sendMessage(data.superAdminId, 'Жалоба от пользователя ' +
                                                                getUsername(ctx.from, true), {
                parse_mode: 'MarkdownV2',
                reply_parameters: forwardMessage ? {
                  message_id: forwardMessage.message_id,
                  chat_id: data.superAdminId,
                } : undefined,
              })

              // Отправить администратору информацию об опросе
              await ctx.telegram.sendMessage(data.superAdminId, 'Ответы на опрос:\n' +
                                                                conversation.context.join('\n------------------------------\n'))
            }
          })
    }
  }
}