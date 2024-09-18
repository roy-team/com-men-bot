/**
 * Сбор и анализ статистики по групповому чату
 */
import { DataTypes } from 'sequelize'
import Module, { CommandContext, getHashFromId, TextContext } from '@src/module.js'
import { getRegisterOptions } from '@src/modules/register.js'
import { sequelize } from '@src/plugins/sequelize.js'
import openAIRequest from '@src/plugins/openai.js'

// Поля записи в таблице БД
interface IStatMessage {
  senderHash: string
  message: string
  is_reply: boolean
  timestamp: number
}

// noinspection JSUnusedGlobalSymbols
export default class extends Module {
  setup() {
    // Добавление модели БД для сообщений
    this.dbModels.StatMessages = {
      senderHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      is_reply: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      timestamp: {
        type: DataTypes.NUMBER,
        allowNull: false,
      },
    }

    // Запланированное событие по анализу
    this.schedules.push({
      cronExpression: '13 2 * * *',
      func: () => {
        void this.analyze()
      },
    })

    // Очистка списка сообщений
    this.commands.statClear = (ctx: CommandContext) => {
      void sequelize.models.StatMessages.truncate()
        .then(() => {
          void ctx.reply('Статистка очищена')
        })
    }

    this.commands.statExport = () => {
      void this.analyze()
    }
  }

  onReceiveTextGroup(ctx: TextContext) {
    void sequelize.models.StatMessages.create({
      senderHash: getHashFromId(ctx.message.from.id),
      message: ctx.message.text,
      is_reply: ctx.message.reply_to_message !== undefined,
      timestamp: Date.now(),
    })
  }

  // Анализ списка сообщений
  async analyze() {
    const now = new Date()
    const registerOptions = await getRegisterOptions()

    if (registerOptions.groupId) {
      const messages = (await sequelize.models.StatMessages.findAll() as unknown as IStatMessage[])
      const subjects: {
        subject: string
        messages: number
      }[] = []

      if (messages.length > 0) {
        const result: string[][] = []
        let lastSender: string
        let lastTimestamp: number

        messages.forEach((item) => {
          const { senderHash, message, timestamp } = item as unknown as IStatMessage

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

        // Отправка запроса к ИИ для анализа тематики сообщений
        const { message } = await openAIRequest([
          'You are analyzing a series of chat messages and identifying the main discussion topics. For each distinct topic, provide a short title and count the number of messages related to that topic. After listing the topics, provide the total number of messages analyzed. Format the response as follows:\n' +
          '\n' +
          'Topic 1 (number of messages on this topic)\n' +
          'Topic 2 (number of messages on this topic)\n' +
          '...and so on.\n' +
          '\n' +
          'Total number of messages: [total count]\n' +
          '\n' +
          'Example:\n' +
          '\n' +
          'Food Recipes (12)\n' +
          'Travel Destinations (8)\n' +
          'Current Events (5)\n' +
          '\n' +
          'Total number of messages: 25\n' +
          '\n' +
          'Analyze the chat and provide a similar breakdown of topics and their respective message counts, along with the total number of messages.',
          result.map((item) => item.join('\n')).join('\n\n'),
        ])

        for (const mes of message.split('\n')) {
          if (mes === '') {
            break
          }

          const sub = mes.match(/(.*?)\s\((\d+)\)/)

          if (sub !== null) {
            subjects.push({
              subject: sub[1],
              messages: parseInt(sub[2]),
            })
          }
        }
      }

      // Формирование статистики
      const statistics = {
        messages: messages.length,
        messagesByUser: await sequelize.models.StatMessages.count({
          attributes: ['senderHash'],
          group: 'senderHash',
        }),
        replies: await sequelize.models.StatMessages.count({
          where: {
            is_reply: true,
          },
        }),
        members: await this.bot.telegram.getChatMembersCount(registerOptions.groupId),
        subjects,
      }

      // Создание и отправка файла
      const csvContent = [
        'Общая статистика:',
        'Всего сообщений,Всего ответов,Всего участников',
        `${statistics.messages},${statistics.replies},${statistics.members}`,
        '',
        'Распределение сообщений по пользователям:',
        'ID,Сообщения',
        ...statistics.messagesByUser.map((item) => `${item.senderHash},${item.count}`),
        '',
        'Темы общения в чате:',
        'Тема,Сообщения',
        ...subjects.map((item) => `${item.subject},${item.messages}`),
      ]
      const nowFormat = [
        now.getDate().toString().padStart(2, '0'),
        (now.getMonth() + 1).toString().padStart(2, '0'),
        now.getFullYear().toString(),
      ].join('.')
      const document = {
        source: Buffer.from(csvContent.join('\n'), 'utf-8'),
        filename: `Статистика ${nowFormat}.csv`,
      }

      if (registerOptions.superAdminId) {
        void this.bot.telegram.sendDocument(registerOptions.superAdminId, document)
      }

      registerOptions.adminIds.forEach((id) => {
        void this.bot.telegram.sendDocument(id, document)
      })

      void sequelize.models.StatMessages.truncate()
    }
  }
}
