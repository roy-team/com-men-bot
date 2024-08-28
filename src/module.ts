/**
 * Скелет модуля, на базе которого можно собирать сторонние модули
 */

/* eslint-disable @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars */
import { Context } from 'telegraf'
import { Message, Update } from 'telegraf/types'

export type TextContext = Context<Update.MessageUpdate<Message.TextMessage>>
export type CommandContext = Context<Update.MessageUpdate<Message.TextMessage>> & {
  command: string
  payload: string
  args: string[]
}

export default class Module {
  // Позволяет временно отключить модуль без удаления
  static enabled = true

  // Список команд, на которые реагирует бот
  commands: Record<string, (ctx: CommandContext) => void> = {}

  static init() {
    return new this
  }

  // Реакция на предопределенную команду start
  startCommand(ctx: CommandContext): void {}

  // Реакция на предопределенную команду help
  helpCommand(ctx: CommandContext): void {}

  // Реакция на получение сообщения в чате
  onReceiveText(ctx: TextContext): void {}
}