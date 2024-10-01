/**
 * Отправляет сообщение чат боту и возвращает результат
 */
import Module, { CommandContext } from '@src/module.js'
import openAIRequest from '@src/plugins/openai.js'

// noinspection JSUnusedGlobalSymbols
export default class extends Module {
  // Отключено
  static enabled = false

  setup() {
    this.commands.aibot = {
      title: 'Отправить сообщение ИИ-боту',
      access: ['privateAdmin'],
      func: (ctx: CommandContext) => {
        if (ctx.payload === '') {
          void ctx.reply('Пустой запрос')
        } else {
          void openAIRequest([ctx.payload]).then(({ message }) => {
            void ctx.reply(message, {
              reply_parameters: {
                message_id: ctx.message.message_id,
              }
            })
          })
        }
      }
    }
  }
}