/**
 * Сохраняет отправленные сообщения
 */

import { createHash } from 'node:crypto'
import { DataTypes, Model } from 'sequelize'
import type { ModelAttributes } from 'sequelize/lib/model'
import Module, { CommandContext, TextContext } from '@src/module.js'
import { sequelize } from '@src/plugins/sequelize.js'

interface ISavedMessage {
  senderHash: string
  message: string
  timestamp: number
}

const SavedMessagesAttributes: ModelAttributes = {
  senderHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.NUMBER,
    allowNull: false,
  },
}

export default class extends Module {
  commands: Record<string, (ctx: CommandContext) => void> = {
    // Получение списка сообщений
    getMessages: (ctx: CommandContext) => {
      void sequelize.models.SavedMessages.findAll()
        .then((messages: Model<typeof SavedMessagesAttributes>[]) => {
          if (messages.length === 0) {
            void ctx.reply('Пусто')
          } else {
            const result: string[][] = []
            let lastSender: string
            let lastTimestamp: number

            messages.forEach((item) => {
              const { senderHash, message, timestamp } = item as unknown as ISavedMessage

              // Если предыдущее сообщение отправлено этим же человеком менее чем 5 секунд назад, то объединяем в одно
              if (lastSender === senderHash && timestamp - lastTimestamp < 5 * 1000) {
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
        })
    },

    // Очистка списка сообщений
    removeMessages: (ctx: CommandContext) => {
      void sequelize.models.SavedMessages.truncate()
        .then(() => {
          void ctx.reply('Сообщения очищены')
        })
    },
  }

  dbModels: Record<string, ModelAttributes> = {
    SavedMessages: SavedMessagesAttributes
  }

  onReceiveText(ctx: TextContext) {
    void sequelize.models.SavedMessages.create({
      senderHash: createHash('sha1').update(ctx.message.from.id.toString()).digest('hex'),
      message: ctx.message.text,
      timestamp: Date.now(),
    })
  }
}