/**
 * Работа телеграм бота
 */

import fs from 'node:fs'
import { Telegraf } from 'telegraf'
import Module from '@src/module.js'
import { message } from 'telegraf/filters'

// Загрузка и хранение списка найденных при запуске модулей
const modules: Module[] = []
async function loadModules(pathModules: string) {
  for (const fileItem of fs.readdirSync(pathModules)) {
    const extension = fileItem.substring(fileItem.length - 3)
    if (extension !== '.ts' && extension !== '.js') {
      continue
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const imported = (await import('./modules/' + fileItem))

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (typeof imported.default !== 'undefined' && imported.default.prototype instanceof Module) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
      const module: typeof Module = imported.default

      if (module.enabled) {
        modules.push(module.init())
      }
    }
  }

  console.log('Loaded modules: ' + modules.length.toString())
}

export default async function (token: string, pathModules: string): Promise<Telegraf> {
  const bot = new Telegraf(token)

  // Подключение функционала модулей на различные события в телеграм
  await loadModules(pathModules)

  // Поддержка предопределенной команду start
  bot.start((ctx) => {
    modules.forEach((module) => {
      module.startCommand(ctx)
    })
  })

  // Поддержка предопределенной команду help
  bot.help((ctx) => {
    modules.forEach((module) => {
      module.helpCommand(ctx)
    })
  })

  // Поиск в модулях определений других команд
  modules.forEach((module) => {
    for (const command in module.commands) {
      bot.command(command, (ctx) => {
        modules.forEach((module) => {
          if (Object.prototype.hasOwnProperty.call(module.commands, command)) {
            module.commands[command](ctx)
          }
        })
      })
    }
  })

  // Поддержка получения сообщений в чате
  bot.on(message('text'), (ctx) => {
    console.log('Event Text')

    modules.forEach((module) => {
      module.onReceiveText(ctx)
    })
  })

  return bot
}
