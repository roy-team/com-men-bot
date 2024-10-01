/**
 * Регистрация в боте группы и администраторов
 */
import { createHash } from 'node:crypto'
import { DataTypes } from 'sequelize'
import { Context, Markup } from 'telegraf'
import { escapers } from '@telegraf/entity'
import Module, { CommandContext, isGroupMember } from '@src/module.js'
import { sequelize } from '@src/plugins/sequelize.js'
import { ChatFromGetChat } from 'telegraf/types'

// Поля записи в таблице БД
interface IRegisterOption {
  option: string
  value: string
}

// noinspection JSUnusedGlobalSymbols
export default class extends Module {
  setup() {
    // Добавление модели БД
    this.dbModels.RegisterOptions = {
      option: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    }

    // Регистрация группы
    this.commands.registerGroup = {
      title: 'Регистрация группы',
      description: 'Разовое действие для настройки бота',
      access: ['privateAll'],
      func: (ctx: CommandContext) => {
        getRegisterOptions()
          .then((data) => {
            if (data.groupId === undefined) {
              ctx.telegram.getChatMember(ctx.payload, ctx.from.id)
                .then((member) => {
                  if (['creator', 'administrator'].includes(member.status)) {
                    void sequelize.models.RegisterOptions.create({
                      option: 'group',
                      value: ctx.payload,
                    })
                    void sequelize.models.RegisterOptions.create({
                      option: 'super_admin',
                      value: ctx.from.id.toString(),
                    })

                    ctx.telegram.getChat(ctx.payload)
                      .then((chat) => {
                        const chatTitle = escapers.MarkdownV2((chat as ChatFromGetChat & { title: string }).title)
                        void ctx.reply(
                          `Группа *${chatTitle}* успешно зарегистрирована\\. Вы добавлены как супер администратор`,
                          {
                            parse_mode: 'MarkdownV2',
                          }
                        )
                      })
                  } else {
                    void ctx.reply('Вы должны быть администратором группы')
                  }
                })
                .catch((e) => {
                  console.error(e)
                  void ctx.reply('Проверьте ID чата')
                })
            } else {
              ctx.telegram.getChat(data.groupId)
                .then((chat) => {
                  const chatTitle = escapers.MarkdownV2((chat as ChatFromGetChat & { title: string }).title)
                  void ctx.reply(
                    `Уже зарегистрирована группа *${chatTitle}*`,
                    {
                      parse_mode: 'MarkdownV2',
                    }
                  )
                })
            }
          })
      }
    }

    this.bot.action(/register_task_.*/, (ctx) => {
      void ctx.answerCbQuery()
        .then(async () => {
          void ctx.deleteMessage(ctx.callbackQuery.message?.message_id)
          const query = (ctx.callbackQuery as unknown as { data?: string }).data?.split('_') ?? []

          if (query.length === 4 && query[2] === getTaskHash(query[3])) {
            const welcomeText = [
              `🎉 Добро пожаловать, ${ctx.from.first_name}! 🎉`,
              'Мы рады видеть вас в нашем дружном сообществе! Этот чат создан для энтузиастов, таких как вы, чтобы обсуждать какую-то тему, делиться опытом и заводить новых друзей. Здесь вы можете учиться, весело проводить время и участвовать в активностях как онлайн, так и офлайн.',
              '',
              '📚 Обязательно ознакомьтесь с нашими:',
              'Правилами чата: https://example.com',
              `Базой знаний: https://www.google.com`,
              '',
              'Мы ценим и отмечаем активное участие. Вот несколько способов, как вы можете проявить себя:',
              'Пригласить друга: Приведите тех, кто может быть заинтересован в наших темах.',
              'Быть активным: Участвуйте в обсуждениях и делитесь своими мыслями.',
              'Отвечать: Взаимодействуйте с сообщениями, которые вас заинтересовали.',
              'Знакомиться: Представьтесь и заводите новые контакты.',
              'Делиться информацией: Вносите ценные идеи и информацию.',
              '',
              '🌟 За каждое ваше положительное действие мы замечаем и ценим это - ожидайте наград и признания!',
              '',
              'Еще раз добро пожаловать на борт! Мы не можем дождаться, чтобы увидеть вашу активность. Давайте вместе сделаем это сообщество замечательным местом!',
            ]

            const rulesMessage = await ctx.reply(welcomeText.join('\n'), {
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback('Принять правила', 'register_rules_accept'),
                ],
              ]),
            })
            await ctx.pinChatMessage(rulesMessage.message_id)
          } else {
            verifyStep1(ctx, false)
          }
        })
    })

    this.bot.action('register_rules_accept', (ctx) => {
      void ctx.answerCbQuery()
        .then(() => {
          if (ctx.update.callback_query.message) {
            void ctx.editMessageReplyMarkup({
              inline_keyboard: []
            })

            getRegisterOptions()
              .then((data) => {
                if (data.groupId) {
                  ctx.telegram.createChatInviteLink(data.groupId, {
                    expire_date: Math.ceil(Date.now() / 1000) + 60 * 60,
                    member_limit: 1,
                  }).then((link) => {
                    void ctx.reply(link.invite_link)
                  })
                }
              })
          }
        })
    })
  }

  startCommand(ctx: CommandContext) {
    getRegisterOptions()
      .then((data) => {
        if (data.superAdminId === undefined) {
          void ctx.reply([
            'Для первоначальной настройки:',
            '1. Добавьте бота в группу с правами администратора',
            '2. Отправьте сюда команду для регистрации группы /registerGroup <ID_группы>',
          ].join('\n'))
        } else if (data.superAdminId === ctx.chat.id.toString()) {
          void ctx.reply('Вы уже являетесь супер администратором')
        } else if (data.adminIds.includes(ctx.chat.id.toString())) {
          void ctx.reply('Вы уже являетесь администратором')
        } else {
          isGroupMember(this.bot, data.groupId!, ctx.from.id)
            .then((result) => {
              if (result) {
                void ctx.reply('Вы уже состоите в группе')
              } else {
                ctx.telegram.getChat(data.groupId!)
                  .then((chat) => {
                    const chatTitle = escapers.MarkdownV2((chat as ChatFromGetChat & { title: string }).title)
                    ctx.reply(`Вас приветствует бот\\-модератор группы *${chatTitle}*`, {
                      parse_mode: 'MarkdownV2',
                    }).then(() => {
                      verifyStep1(ctx)
                    })
                  })
              }
            })
        }
      })
  }
}

export async function getRegisterOptions() {
  let groupId: string | undefined
  let superAdminId: string | undefined
  let adminIds: string[] = [];

  (await sequelize.models.RegisterOptions.findAll()).forEach((row) => {
    const { option, value } = row as unknown as IRegisterOption

    switch (option) {
      case 'group':
        groupId = value
        break
      case 'super_admin':
        superAdminId = value
        break
      case 'admins':
        try {
          adminIds = JSON.parse(value) ?? []
        } catch (e) {
          adminIds = []
        }
    }
  })

  if (superAdminId) {
    adminIds.unshift(superAdminId)
  }

  return {
    groupId,
    superAdminId,
    adminIds,
  }
}

const getTaskHash = (n: number | string): string =>
  createHash('sha256').update(n.toString()).digest('hex').substring(0, 8)

const verifyStep1 = (ctx: Context, first: boolean = true) => {
  const op = Math.random() >= 0.5 ? '+' : '-'
  let firstNumber = Math.floor(Math.random() * 100)
  let secondNumber = Math.floor(Math.random() * 100)

  if (op === '-' && firstNumber < secondNumber) {
    firstNumber += secondNumber
    secondNumber = firstNumber - secondNumber
    firstNumber -= secondNumber
  }

  const prompt = first ? 'Для начала решите простой пример:' : 'Что-то пошло не так. Попробуем еще раз:'
  const result = op === '+' ? firstNumber + secondNumber : firstNumber - secondNumber
  const hash = getTaskHash(result)
  const variants = new Array(5).fill(0).map(() => Math.floor(Math.random() * 100))
  variants.push(result)
  variants.sort()

  void ctx.reply(`${prompt} ${firstNumber} ${op} ${secondNumber} = ?`, {
    ...Markup.inlineKeyboard([
      variants.slice(0, 3).map((item) =>
        Markup.button.callback(item.toString(), `register_task_${hash}_${item}`)),
      variants.slice(3, 6).map((item) =>
        Markup.button.callback(item.toString(), `register_task_${hash}_${item}`)),
    ]),
  })
}