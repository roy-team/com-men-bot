/**
 * Удаление сообщения, в котором встречается слово из списка
 * Переменные окружения:
 *  SWEAR_AI_ENABLE - Включить анализ сообщений с помощью ИИ
 */
import Module, { getUsername, TextContext } from '@src/module.js'
import { getRegisterOptions } from '@src/modules/register.js'
import openAIRequest from '@src/plugins/openai.js'

// noinspection JSUnusedGlobalSymbols
export default class extends Module {
  // Список триггерных слов
  swearWords = ['fuck', 'shit', 'dick', 'asshole', 'bitch', 'damn', 'stupid']
  lastMessages: string[] = []
  enableAI = Boolean(process.env.SWEAR_AI_ENABLE ?? false)

  onReceiveTextGroup(ctx: TextContext) {
    let isTrigger = false

    for (const word of
      ctx.message.text
        .split(' ')
        .filter((item) => item !== '')
        .map((item) => item.toLowerCase())
      ) {
      // Разбираем сообщение по словам и проверяем наличие каждого слова в списке
      if (this.swearWords.includes(word)) {
        isTrigger = true
        break
      }
    }

    // Триггер на слово сработал, продолжаем анализ
    if (isTrigger) {
      getRegisterOptions()
        .then(async (data) => {
          let isTrigger = true
          let additionalAI = ''

          if (this.enableAI) {
            // Отправка запроса к ИИ для анализа сообщения и его контекста, если активно
            const { message } = await openAIRequest([
              'Please complete the following tasks:\n' +
              '\n' +
              'Step 1: Analyze Message for Violations of Community Rules\n' +
              'Rule 1: "Respect for participants"\n' +
              'Terms: All participants are required to show respect for each other regardless of race, gender, age, or other differences. Any form of discrimination or disrespectful behavior is prohibited.\n' +
              '\n' +
              'Task: Analyze a given message in the conversation and check for potential violations of Rule 1.\n' +
              '\n' +
              'Step 2: Contextual Analysis\n' +
              'If a potential violation of Rule 1 is detected, perform a deeper analysis by reviewing the previous messages in the conversation.\n' +
              '\n' +
              'Assessment:\n' +
              '\n' +
              'Evaluate whether the violation was intentional or merely a coincidence of words.\n' +
              'Provide a detailed explanation of your assessment, referencing specific previous messages.\n' +
              'Estimate the probability of a rule violation in percentage terms.\n' +
              '\n' +
              'Step 3: Result\n' +
              'If the violation is confirmed with a probability of 70% or more, generate a message explaining the violation. Otherwise, answer only "no".' +
              'Message for analysis:\n' +
              ctx.message.text,
              'Previous messages:\n' +
              this.lastMessages.join('\n'),
            ])

            if (message === 'no') {
              // ИИ не посчитал сообщение нарушением правил
              isTrigger = false
            } else {
              // Сохранить пояснение ИИ для отправки администратору
              additionalAI = message
            }
          }

          // Сообщение все равно считается нарушением (с учетом возможного анализа ИИ)
          if (isTrigger) {
            // Для идентификации нарушителя использовать имя пользователя либо, в случае отсутствия, личное имя
            const user = getUsername(ctx.from, true)

            if (data.superAdminId) {
              // Переслать сообщение с нарушением администратору с указанием пользователя
              const forwardMessage = await ctx.forwardMessage(data.superAdminId)
              void ctx.telegram.sendMessage(data.superAdminId, 'Неприемлемый контент от ' + user, {
                parse_mode: 'MarkdownV2',
                reply_parameters: {
                  message_id: forwardMessage.message_id,
                  chat_id: data.superAdminId,
                }
              })

              if (additionalAI !== '') {
                // Добавить пояснение от ИИ, если есть
                void ctx.telegram.sendMessage(data.superAdminId, additionalAI, {
                  reply_parameters: {
                    message_id: forwardMessage.message_id,
                    chat_id: data.superAdminId,
                  }
                })
              }
            }

            // Удалить сообщение в общем чате
            void ctx.deleteMessage(ctx.message.message_id)
            // Написать о неприемлемом контенте с указанием имени нарушителя
            void ctx.reply(user + ', это неприемлемый контент, он будет удален\\.', {
              parse_mode: 'MarkdownV2',
            })
          }
        })
    } else {
      // Сохранить контекст общения (последние 5 сообщений)
      this.lastMessages.push(ctx.message.text)

      while (this.lastMessages.length > 5) {
        this.lastMessages.shift()
      }
    }
  }
}