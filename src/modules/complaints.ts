/**
 * Система жалоб на пользователей чата
 */
import Module, { CommandContext, getUsername } from '@src/module.js'
import { getRegisterOptions } from '@src/modules/register.js'

// noinspection JSUnusedGlobalSymbols
export default class extends Module {
  setup() {
    this.commands.complaint = {
      description: 'Отправка жалобы. Пожаловаться на конкретное сообщение можно ответом на это сообщение',
      access: ['privateAll', 'groupAll'],
      func: async (ctx: CommandContext) => {
        // Проверяем, было ли это ответом на сообщение
        if (ctx.message.reply_to_message) {
          const data = await getRegisterOptions()

          // На всякий случай проверить, была ли регистрация чата
          if (data.superAdminId && data.groupId) {
            // Переслать администратору сообщение, на которое была жалоба, с указанием жалобщика
            const forwardMessage = await ctx.telegram.forwardMessage(
              data.superAdminId,
              data.groupId,
              ctx.message.reply_to_message.message_id
            )
            await ctx.telegram.sendMessage(data.superAdminId, 'Жалоба от пользователя ' + getUsername(ctx.from, true), {
              parse_mode: 'MarkdownV2',
              reply_parameters: {
                message_id: forwardMessage.message_id,
                chat_id: data.superAdminId,
              }
            })

            if (ctx.payload.trim() !== '') {
              // Если есть дополнительный текст жалобы, то также отправить администратору
              await ctx.telegram.sendMessage(data.superAdminId, ctx.payload.trim(), {
                reply_parameters: {
                  message_id: forwardMessage.message_id,
                  chat_id: data.superAdminId,
                }
              })
            }
          }
        }
      }
    }
  }
}