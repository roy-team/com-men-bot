/**
 * Скелет модуля, на базе которого можно собирать сторонние модули
 */
/* eslint-disable @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars */
import { createHash } from 'node:crypto'
import type { ScheduleOptions } from 'node-cron'
import { Context, Telegraf } from 'telegraf'
import { escapers } from '@telegraf/entity'
import { Message, Update, User } from 'telegraf/types'
import type { ModelAttributes } from 'sequelize/lib/model'
import {
  MessageOriginChannel,
  MessageOriginChat,
  MessageOriginHiddenUser,
  MessageOriginUser
} from '@telegraf/types/message.js'

export type BotCommand = {
  description: string
  access?: ('privateAll' | 'privateAdmin' | 'groupAll' | 'groupAdmin' | 'groupSuperAdmin')[]
  addToList?: number
  func: (ctx: CommandContext) => void
}

export type TextContext = Context<Update.MessageUpdate<Message.TextMessage>>
export type CommandContext = Context<Update.MessageUpdate<Message.TextMessage>> & {
  command: string
  payload: string
  args: string[]
}

export default class Module {
  // Позволяет временно отключить модуль без удаления
  static enabled = true

  // Для обратного обращения к боту из модулей
  readonly bot: Telegraf

  // Список моделей, требуемых для работы с БД
  dbModels: Record<string, ModelAttributes> = {}

  // Список запланированных действий
  schedules: {
    cronExpression: string
    func: () => void
    options?: ScheduleOptions
  }[] = []

  // Список команд, на которые реагирует бот
  commands: Record<string, BotCommand> = {}

  static init(bot: Telegraf) {
    return new this(bot)
  }

  constructor(bot: Telegraf) {
    this.bot = bot
    this.setup()
  }

  setup(): void {}

  // Реакция на предопределенную команду start
  startCommand(ctx: CommandContext): void {}

  // Реакция на получение пересланного сообщения в личном чате
  onReceiveForward(
    ctx: TextContext,
    origin: MessageOriginUser | MessageOriginHiddenUser | MessageOriginChat | MessageOriginChannel,
  ): void {}

  // Реакция на получение пересланного сообщения в групповом чате
  onReceiveForwardGroup(
    ctx: TextContext,
    origin: MessageOriginUser | MessageOriginHiddenUser | MessageOriginChat | MessageOriginChannel,
  ): void {}

  // Реакция на получение текстового сообщения в личном чате
  onReceiveText(ctx: TextContext): void {}

  // Реакция на получение текстового сообщения в групповом чате
  onReceiveTextGroup(ctx: TextContext): void {}
}

// Преобразовать ID в хеш
const getHashFromId = (id: number | string): string => createHash('sha1').update(id.toString()).digest('hex')

// Получить имя пользователя либо личное имя
const getUsername = (user: User, markdown: boolean = false): string => {
  return markdown ?
    (user.username ? '\\@' + escapers.MarkdownV2(user.username) : `\`${escapers.MarkdownV2(user.first_name)}\``) :
    (user.username ? '@' + user.username : user.first_name)
}

const isGroupMember = async (bot: Telegraf, groupId: number | string, userId: number) => {
  return ['creator', 'administrator', 'member'].includes((await bot.telegram.getChatMember(groupId, userId)).status)
}

export {
  getHashFromId,
  getUsername,
  isGroupMember,
}