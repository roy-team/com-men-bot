/**
 * Удаление сообщения, в котором встречается слово из списка
 */

import Module, { TextContext } from '@src/module.js'

export default class extends Module {
  swearWords = ['fuck', 'shit', 'dick', 'asshole', 'bitch', 'damn']

  onReceiveText(ctx: TextContext) {
    for (const word of ctx.message.text
      .split(' ')
      .filter((item) => item !== '')
      .map((item) => item.toLowerCase())) {
      // Разбираем сообщение по словам и проверяем наличие каждого слова в списке
      if (this.swearWords.includes(word)) {
        void ctx.deleteMessage(ctx.message.message_id)
      }
    }
  }
}