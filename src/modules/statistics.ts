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
  senderName: string
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
      senderName: {
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

    // Запланированное событие по формированию статистики с очисткой БД
    this.schedules.push({
      cronExpression: '59 23 * * *',
      func: () => {
        this.analyze()
          .then(() => {
            void sequelize.models.StatMessages.truncate()
          })
      },
    })

    // Очистка списка сообщений
    this.commands.statClear = {
      title: 'Очистка текущей статистики',
      func: (ctx: CommandContext) => {
        void sequelize.models.StatMessages.truncate()
          .then(() => {
            void ctx.reply('Статистка очищена')
          })
      }
    }

    // Запрос на принудительное формирование статистики без очистки БД
    this.commands.statExport = {
      title: 'Получение текущей статистики',
      func: () => {
        void this.analyze()
      }
    }
  }

  onReceiveForwardGroup(ctx: TextContext) {
    void sequelize.models.StatMessages.create({
      senderHash: getHashFromId(ctx.message.from.id),
      senderName: `${ctx.message.from.first_name} ${ctx.message.from.last_name ?? ''}`.trim(),
      message: ctx.message.text,
      is_reply: ctx.message.reply_to_message !== undefined,
      timestamp: Date.now(),
    })
  }

  onReceiveTextGroup(ctx: TextContext) {
    void sequelize.models.StatMessages.create({
      senderHash: getHashFromId(ctx.message.from.id),
      senderName: `${ctx.message.from.first_name} ${ctx.message.from.last_name ?? ''}`.trim(),
      message: ctx.message.text,
      is_reply: ctx.message.reply_to_message !== undefined,
      timestamp: Date.now(),
    })
  }

  // Анализ списка сообщений
  async analyze() {
    const now = new Date()
    const nowFormat = [
      now.getDate().toString().padStart(2, '0'),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getFullYear().toString(),
    ].join('.')
    const registerOptions = await getRegisterOptions()

    if (registerOptions.groupId) {
      const messages: IStatMessage[] = [];

      ((await sequelize.models.StatMessages.findAll()) as unknown as IStatMessage[]).forEach((item) => {
        // Проверка на пустое сообщение
        if (item.message.trim().length > 0) {
          // Если предыдущее сообщение отправлено этим же человеком менее чем 5 секунд назад, то объединяем в одно
          if (
            messages.length > 0 &&
            item.senderHash === messages[messages.length - 1].senderHash &&
            item.timestamp - messages[messages.length - 1].timestamp < (5 * 1000)
          ) {
            messages[messages.length - 1].message += '\n' + item.message
          } else {
            messages.push(item)
          }
        }
      })

      const subjects: {
        subject: string
        messages: number
      }[] = []

      if (messages.length > 0) {
        // Отправка запроса к ИИ для анализа тематики сообщений
        const prompt = [
          'You are analyzing a series of chat messages and identifying the main discussion topics. For each distinct topic, provide a short title and count the number of messages related to that topic. After listing the topics, provide the total number of messages analyzed. Format the response as follows:',
          '',
          'Topic 1 (number of messages on this topic)',
          'Topic 2 (number of messages on this topic)',
          '...and so on.',
          '',
          'Total number of messages: [total count]',
          '',
          'Example:',
          '',
          'Food Recipes (12)',
          'Travel Destinations (8)',
          'Current Events (5)',
          '',
          'Total number of messages: 25',
          '',
          'Analyze the chat and provide a similar breakdown of topics and their respective message counts, along with the total number of messages.',
        ]
        const { message } = await openAIRequest([
          prompt.join('\n'),
          messages.map((item) => `[${new Date(item.timestamp).toLocaleString()}] ${item.senderHash}\n${item.message}`).join('\n\n'),
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
          attributes: ['senderHash', 'senderName'],
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
        'Дата,Всего сообщений,Всего ответов,Всего участников',
        `${nowFormat},${statistics.messages},${statistics.replies},${statistics.members}`,
        '',
        'Распределение сообщений по пользователям:',
        'ID,Имя,Сообщения,Дата',
        ...statistics.messagesByUser.map((item) => `${item.senderHash},"${item.senderName}",${item.count},${nowFormat}`),
        '',
        'Темы общения в чате:',
        'Тема,Сообщения,Дата',
        ...subjects.map((item) => `"${item.subject}",${item.messages},${nowFormat}`),
      ]
      const document = {
        source: Buffer.from(csvContent.join('\n'), 'utf-8'),
        filename: `Статистика ${nowFormat}.csv`,
      }

      registerOptions.adminIds.forEach((id) => {
        void this.bot.telegram.sendDocument(id, document)
      })
    }
  }
}
