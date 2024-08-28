/**
 * Универсальный исполняемый код для запуска на VPS/Docker/etc.
 * Переменные окружения:
 *  BOT_TOKEN - Токен для привязки бота, полученный от BotFather.
 *  WEBHOOK_DOMAIN - Домен, по которому будет доступна программа.
 *  WEBHOOK_SECRET - Секретный текст, который сохранит от посторонних запросов.
 */

import telegram from '@src/telegram.js'

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
  void telegram(botToken).then((bot) => {
    void bot.launch({ webhook })

    // Позволяет "плавно" остановить программу
    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
  })
}