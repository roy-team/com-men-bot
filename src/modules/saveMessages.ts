/**
 * Сохраняет отправленные сообщения
 */

import { createHash } from 'node:crypto'
import Module, { CommandContext, TextContext } from '@src/module.js'

let messages: {
  senderHash: string
  message: string
  timestamp: number
}[] = []

export default class extends Module {
  commands = {
    // Получение списка сообщений
    getMessages: (ctx: CommandContext) => {
      if (messages.length === 0) {
        void ctx.reply('Пусто')
      } else {
        const result: string[][] = []
        let lastSender: string
        let lastTimestamp: number

        messages.forEach(({ senderHash, message, timestamp }) => {
          // Если предыдущее сообщение отправлено этим же человеком менее чем 10 секунд назад, то объединяем в одно
          if (lastSender === senderHash && timestamp - lastTimestamp < 10 * 1000) {
            result[result.length - 1].push(message)
          } else {
            // Собираем формат вывода вида: "[время/дата] отправитель" и далее отправленные сообщения
            result.push([
              `[${new Date(timestamp).toLocaleString()}] ${senderHash}`,
              message,
            ])
          }

          lastSender = senderHash
          lastTimestamp = timestamp
        })

        void ctx.reply(result.map((item) => item.join('\n')).join('\n\n'))
      }
    },

    removeMessages: (ctx: CommandContext) => {
      messages = []
      void ctx.reply('Сообщения очищены')
    },
  }

  onReceiveText(ctx: TextContext) {
    messages.push({
      senderHash: createHash('sha1').update(ctx.message.from.id.toString()).digest('hex'),
      message: ctx.message.text,
      timestamp: Date.now(),
    })
  }
}