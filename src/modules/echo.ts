/**
 * Дублирует отправленное сообщение
 */
import Module, { TextContext } from '@src/module.js'

// noinspection JSUnusedGlobalSymbols
export default class extends Module {
  // Отключено
  static enabled = false

  onReceiveText(ctx: TextContext) {
    void ctx.reply(ctx.message.text)
  }

  onReceiveTextGroup(ctx: TextContext) {
    void ctx.reply(ctx.message.text)
  }
}