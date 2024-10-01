/**
 * Система жалоб на пользователей чата
 */
import Module, { CommandContext, getUsername, isGroupMember } from '@src/module.js'
import { getRegisterOptions } from '@src/modules/register.js'

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

          // Переслать администратору сообщение, на которое была жалоба, если было отмечено
          if (ctx.message.reply_to_message) {
            forwardMessage = await ctx.telegram.forwardMessage(
              data.superAdminId,
              data.groupId,
              ctx.message.reply_to_message.message_id
            )
          }

          // Отправить администратору информацию об авторе жалобы
          await ctx.telegram.sendMessage(data.superAdminId, 'Жалоба от пользователя ' + getUsername(ctx.from, true), {
            parse_mode: 'MarkdownV2',
            reply_parameters: forwardMessage ? {
              message_id: forwardMessage.message_id,
              chat_id: data.superAdminId,
            } : undefined,
          })
        }
      }
    }

    this.commands.complaintAdv = {
      title: 'Отправка жалобы расширенная',
      access: ['privateAll'],
      addToList: 31,
      func: async (ctx: CommandContext) => {

      }
    }
  }
}