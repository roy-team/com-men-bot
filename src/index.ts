/**
 * Универсальный исполняемый код для запуска на VPS/Docker/etc.
 * Переменные окружения:
 *  BOT_TOKEN - Токен для привязки бота, полученный от BotFather.
 *  WEBHOOK_DOMAIN - Домен, по которому будет доступна программа.
 *  WEBHOOK_SECRET - Секретный текст, который сохранит от посторонних запросов.
 *  TZ - Временная зона (https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
 */
import telegram from '@src/telegram.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const botToken = process.env.BOT_TOKEN

const webhook = {
  domain: process.env.WEBHOOK_DOMAIN ?? '',
  port: 3000,
  secretToken: process.env.WEBHOOK_SECRET ?? '',
}

if (botToken === undefined ||
    webhook.domain === '' ||
    webhook.secretToken === '') {
  console.error('Environment variables not exist')
} else {
  // Инициализация телеграм бота и запуск
  const pathModules = path.join(path.dirname(fileURLToPath(import.meta.url)), 'modules')
  void telegram(botToken, pathModules)
    .then((bot) => {
      void bot.launch({
        webhook,
        allowedUpdates: [
          'message',
          'message_reaction',
          'callback_query',
        ],
      })

      // Позволяет "плавно" остановить программу
      process.once('SIGINT', () => bot.stop('SIGINT'))
      process.once('SIGTERM', () => bot.stop('SIGTERM'))
    })
}