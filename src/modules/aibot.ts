/**
 * Отправляет сообщение чат боту и возвращает результат
 */

import Module, { TextContext } from '@src/module.js'
import openAIRequest from '@src/plugins/openai.js'

export default class extends Module {
  // Отключено
  static enabled = false

  onReceiveText(ctx: TextContext) {
    void openAIRequest(ctx.message.text).then((value) => {
      if (value === null) {
        void ctx.reply('Произошла ошибка')
      } else {
        void ctx.reply(value)
      }
    })
  }
}