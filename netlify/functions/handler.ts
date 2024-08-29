/**
 * Исполняемый код для запуска на Netlify.
 * Переменные окружения:
 *  BOT_TOKEN - Токен для привязки бота, полученный от BotFather.
 *  WEBHOOK_DOMAIN - Домен, по которому будет доступна программа.
 *  WEBHOOK_SECRET - Секретный текст, который сохранит от посторонних запросов.
 */

// @ts-ignore
import path from 'node:path'
import telegram from '@src/telegram.js'
import type { Update } from 'telegraf/types'
import type { Telegraf } from 'telegraf'

const botToken = process.env.BOT_TOKEN
const domain = process.env.WEBHOOK_DOMAIN
const secretToken = process.env.WEBHOOK_SECRET

if (botToken === undefined || domain === undefined || secretToken === undefined) {
  console.error('Environment variables not exist')
  process.abort()
}

// Инициализация телеграм бота и запуск
let bot: Telegraf
const pathModules = path.join(process.cwd(), 'src', 'modules')
telegram(botToken, pathModules).then((bt: Telegraf) => {
  bot = bt
})

export default async (req: Request) => {
  const secret = new URL(req.url).pathname.split('/')[1]

  // Установка вебхука телеграм по запросу <домен>/set/handler
  if (secret === 'set') {
    await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${domain}/${secretToken}/handler`)
  }

  // Выполнение команд от телеграм, если присутствует секретный токен
  if (secret === secretToken) {
    try {
      await bot.handleUpdate(await req.json() as Update)
    } catch (e) { /* empty */ }
  }

  return new Response('OK')
}