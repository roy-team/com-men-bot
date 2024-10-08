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
import { MyTelegraf, TConversationData } from '@src/telegraf.js'

export type BotCommand = {
  title: string
  description?: string
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
  readonly bot: MyTelegraf

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

  // Список тегов для создания тематической беседы/опроса
  conversationTags: string[] = []

  static init(bot: MyTelegraf) {
    return new this(bot)
  }

  constructor(bot: MyTelegraf) {
    this.bot = bot
    this.setup()
  }

  setup(): void {}

  // Стартовые команды
  async start(): void {}

  // Реакция на предопределенную команду start
  startCommand(ctx: CommandContext): void {}

  // Реакция на получение сообщения в пределах беседы/опроса
  onConversation(ctx: TextContext, conversation: TConversationData): void {}

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
export function getHashFromId(id: number | string): string {
  return createHash('sha1').update(id.toString()).digest('hex')
}

// Получить имя пользователя либо личное имя
export function getUsername(user: User, markdown: boolean = false): string {
  return markdown ?
    (user.username ? '\\@' + escapers.MarkdownV2(user.username) : `\`${escapers.MarkdownV2(user.first_name)}\``) :
    (user.username ? '@' + user.username : user.first_name)
}

export async function isGroupMember(bot: Telegraf, groupId: number | string, userId: number) {
  return ['creator', 'administrator', 'member'].includes((await bot.telegram.getChatMember(groupId, userId)).status)
}