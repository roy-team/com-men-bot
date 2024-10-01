/**
 * Работа телеграм бота
 */
import fs from 'node:fs'
import NodeCron from 'node-cron'
import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import { escapers } from '@telegraf/entity'
import Module, { BotCommand } from '@src/module.js'
import { getRegisterOptions } from '@src/modules/register.js'
import { initModel, sequelize } from '@src/plugins/sequelize.js'
import { BotCommand as tgBotCommand } from '@telegraf/types'

// Загрузка и хранение списка найденных при запуске модулей
const modules: Module[] = []

// Хранение списка команд
const commands: Record<string, BotCommand> = {
  commands: {
    title: 'Список доступных команд',
    func: async (ctx) => {
      const output = []

      for (const name in commands) {
        const access = commands[name].access ?? []
        const allowed = {
          private: access.includes('privateAll') ? 'все' :
            (access.includes('privateAdmin') ? 'администраторы' : 'супер администратор'),
          group: access.includes('groupAll') ? 'все' :
            (access.includes('groupAdmin') ? 'администраторы' :
                (access.includes('groupSuperAdmin') ? 'супер администратор' : '')
            ),
        }

        output.push(`\n/${name} \\- ${escapers.MarkdownV2(commands[name].title)}`)

        if (commands[name].description) {
          output.push(`_${escapers.MarkdownV2(commands[name].description)}_`)
        }

        output.push(`\\- приватный чат: *${allowed.private}*`)

        if (allowed.group !== '') {
          output.push(`\\- групповой чат: *${allowed.group}*`)
        }
      }

      void ctx.reply(output.join('\n'), {
        parse_mode: 'MarkdownV2',
      })
    }
  },
}

async function loadModules(pathModules: string, bot: Telegraf) {
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
        modules.push(module.init(bot))
      }
    }
  }

  console.debug('Loaded modules: ' + modules.length.toString())
}

export default async function (token: string, pathModules: string): Promise<Telegraf> {
  const bot = new Telegraf(token)

  // Подключение функционала модулей на различные события в телеграм
  await loadModules(pathModules, bot)

  // Подключение БД моделей
  modules.forEach((module) => {
    Object.keys(module.dbModels).forEach((name) => {
      initModel(name, module.dbModels[name])
    })
  })
  await sequelize.sync()

  // Подключение запланированных действий
  modules.forEach((module) => {
    module.schedules.forEach(({ cronExpression, func, options }) => {
      NodeCron.schedule(cronExpression, func, options)
    })
  })

  // Поддержка предопределенной команду start
  bot.start((ctx) => {
    if (ctx.chat.type === 'private') {
      modules.forEach((module) => {
        module.startCommand(ctx)
      })
    } else {
      ctx.deleteMessage()
    }
  })

  // Поддержка предопределенной команду help
  bot.help((ctx) => {
    if (ctx.chat.type !== 'private') {
      ctx.deleteMessage()
    }
  })

  // Поиск в модулях определений других команд
  modules.forEach((module) => {
    for (const name in module.commands) {
      if (commands[name] !== undefined) {
        console.error(`Command "${name}" already exist`)
        continue
      }

      commands[name] = module.commands[name]
    }
  })
  console.debug('Found commands: ' + Object.keys(commands).length.toString())

  // Регистрация списка команд и контроль разрешения на выполнение
  const regOptions = await getRegisterOptions()
  const myCommands: (tgBotCommand & { sort: number })[] = []
  for (const name in commands) {
    bot.command(name, (ctx) => {
      const access = commands[name].access ?? []
      let allow

      if (ctx.chat.type === 'private') {
        allow =
          access.includes('privateAll') ||
          access.includes('privateAdmin') && regOptions.adminIds.includes(ctx.from.id.toString()) ||
          regOptions.superAdminId === ctx.from.id.toString()
      } else {
        if (regOptions.groupId !== ctx.chat.id.toString()) {
          return
        }

        ctx.deleteMessage()
        allow =
          access.includes('groupAll') ||
          access.includes('groupAdmin') && regOptions.adminIds.includes(ctx.from.id.toString()) ||
          access.includes('groupSuperAdmin') && regOptions.superAdminId === ctx.from.id.toString()
      }

      if (allow) {
        commands[name].func(ctx)
      }
    })

    if (commands[name].addToList !== undefined) {
      myCommands.push({
        command: name,
        description: commands[name].title,
        sort: commands[name].addToList,
      })
    }
  }
  myCommands.sort((a, b) => a.sort - b.sort)
  void bot.telegram.setMyCommands(myCommands)

  // Поддержка получения прямых и пересланных текстовых сообщений в чате
  bot.on(message('text'), (ctx) => {
    modules.forEach((module) => {
      if (ctx.update.message.forward_origin === undefined) {
        // Прямое сообщение
        if (ctx.update.message.chat.type === 'private') {
          // Личный чат
          module.onReceiveText(ctx)
        } else {
          // Групповой чат
          if (regOptions.groupId === ctx.chat.id.toString()) {
            module.onReceiveTextGroup(ctx)
          }
        }
      } else {
        // Пересланное сообщение
        if (ctx.update.message.chat.type === 'private') {
          // Личный чат
          module.onReceiveForward(ctx, ctx.update.message.forward_origin)
        } else {
          // Групповой чат
          if (regOptions.groupId === ctx.chat.id.toString()) {
            module.onReceiveForwardGroup(ctx, ctx.update.message.forward_origin)
          }
        }
      }
    })
  })

  return bot
}