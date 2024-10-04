/**
 * Система жалоб на пользователей чата
 */
import Module, { CommandContext, getUsername, isGroupMember, TextContext } from '@src/module.js'
import { getRegisterOptions } from '@src/modules/register.js'
import { TConversationData } from '@src/telegraf.js'
import openAIRequest from '@src/plugins/openai.js'

// noinspection JSUnusedGlobalSymbols
export default class extends Module {
  conversationTags = ['complaint']

  setup() {
    this.commands.complaint = {
      title: 'Отправка жалобы',
      description: 'Пожаловаться на конкретное сообщение можно ответом на это сообщение',
      access: ['privateAll', 'groupAll'],
      addToList: 30,
      func: async (ctx: CommandContext) => {
        const data = await getRegisterOptions()

        // На всякий случай проверить, была ли регистрация чата
        if (data.superAdminId && data.groupId) {
          // Является ли автор жалобы членом группы, если запрос был в приватном чате
          if (ctx.chat.type === 'private' && !(await isGroupMember(this.bot, data.groupId, ctx.from.id))) {
            return
          }

          // Начать опрос по сути жалобы
          void ctx.telegram.sendMessage(ctx.from.id, 'Опишите коротко суть жалобы\n(Пожалуйста, укажите конкретные детали инцидента, которые вызвали вашу жалобу)\nВы можете прервать опрос используя команду /stop')
          this.bot.initConversation(ctx.from.id, 'complaint')

          // Сохранить ID сообщения, на которое была жалоба, если было отмечено
          this.bot.addConversationContext(ctx.from.id, (ctx.message.reply_to_message ? ctx.message.reply_to_message.message_id : 0).toString())
        }
      }
    }
  }

  onConversation(ctx: TextContext, conversation: TConversationData) {
    this.bot.addConversationContext(ctx.from.id, ctx.message.text)

    switch (conversation.step) {
      case 2:
        void ctx.reply('Если это нарушает правила сообщества, то укажите, какие:\n(Выберите один или несколько вариантов, которые, по вашему мнению, были нарушены)\n' +
                       [
                         'Уважение к участникам',
                         'Запрет на споры на религиозные и политические темы',
                         'Запрет на рекламные публикации',
                         'Защита личной информации',
                         'Соблюдение темы чата',
                         'Модерация и санкции',
                         'Либо напишите свой вариант',
                       ].join('\n'))
        break
      case 3:
        void ctx.reply('Какие, на ваш взгляд, нужно принять решения, чтобы улучшить ситуацию?\n(Поделитесь своими предложениями по решению конфликта или улучшению правил сообщества)')
        break
      case 4:
        void ctx.reply('Жалоба зафиксирована и будет направлена администратору')

        getRegisterOptions()
          .then(async (data) => {
            // На всякий случай проверить, была ли регистрация чата
            if (data.superAdminId && data.groupId) {
              let forwardMessage
              const messageId = parseInt(conversation.context.shift() ?? '0')

              // Переслать администратору сообщение, на которое была жалоба, если было отмечено
              if (messageId) {
                forwardMessage = await ctx.telegram.forwardMessage(
                  data.superAdminId,
                  data.groupId,
                  messageId,
                )
              }

              // Отправить администратору информацию об авторе жалобы
              await ctx.telegram.sendMessage(data.superAdminId, 'Жалоба от пользователя ' +
                                                                getUsername(ctx.from, true), {
                parse_mode: 'MarkdownV2',
                reply_parameters: forwardMessage ? {
                  message_id: forwardMessage.message_id,
                  chat_id: data.superAdminId,
                } : undefined,
              })

              // Отправить администратору информацию об опросе
              await ctx.telegram.sendMessage(data.superAdminId, 'Ответы на опрос:\n' +
                                                                conversation.context.join('\n------------------------------\n'))

              // Остановить текущий опрос
              this.bot.stopConversation(ctx.from.id)

              // Анализ жалобы с помощью ИИ
              const { message } = await openAIRequest([
                'You are a polite, objective, and fair moderator for a community chat. Your primary responsibilities are to maintain a respectful, safe, and goal-oriented environment for all participants. You must only respond to messages related to moderation and community rules.',
                'You will receive complaints from community members. Your job is to analyze these complaints, understand how they relate to the community rules, and respond accordingly.',
                '1. Accept the complaint from the member, analyze the context of the complaint in the form of consecutive messages. If screenshots or links to messages are attached, include them in your analysis. Ask clarifying questions to the member if needed.',
                '2. Analyze the complaint and determine how it potentially violates the community rules or affects the safety, comfort, or objectives of the chat participants.',
                '3. Based on your analysis, decide on the appropriate actions. If the probability that the complaint violates community rules or harms members is less than 40%, respond with \'no.\' If the probability is between 50% and 100%, propose a solution according to the rules and suggest penalties if necessary.',
                '4. If the probability is between 50% and 100%, identify any trigger words that indicate a violation of the rules and include them in your response.',
                '5. Compose a response to the member who filed the complaint. Your response should include a brief analysis of the complaint, a conclusion about the violation type, the actions to be taken, recommendations, and appreciation for the member\'s attention to community well-being. Be polite and reassuring, and ensure the member feels their concerns have been acknowledged and addressed.',
                'Example of a response:\n\nA complaint was received from participant @NAME (complaint text). With a 50% probability, it violates the rules of the community (brief summary of the rule). Trigger words indicating a violation of the rules: (words).\n\nResponse to Member: 🌼 Hello [Username], Thank you for reaching out to us and sharing your concerns. We have reviewed (summary of complaint) and believe that (response to gist of complaint). We value your feedback as it helps us improve the experience for everyone in our community. Please let us know if there are other ways we can make your stay more enjoyable. We are here for you and appreciate your participation in our community! [Admin/Team Community Name] 🌸',
                'Here are the community rules:\n\n1. Respect for Members: All members are expected to treat each other with respect, regardless of race, gender, age, or other differences. Discrimination and disrespectful behavior are prohibited.\n2. Keeping the Chat Topic: Discussions of religion and politics are allowed, but debates on these topics are strictly prohibited. Strive for constructive and respectful conversations.\n3. Promotional Posts Ban: Any advertising, commercial suggestions, links to external resources, and spam are prohibited unless approved by administrators.\n4. Protection of Personal Information: Collecting, using, or transferring personal information of participants is strictly prohibited. Misuse of this information for fraud or extortion is also forbidden.\n5. Compliance with the Chat Topic: Ensure your messages are relevant to the chat topic. Avoid cluttering discussions with unrelated topics.\n6. Moderation and Sanctions: Moderators can issue warnings, restrict rights temporarily, or implement permanent bans for repeated violations.',
                'Please process the following complaint:\n\n' + conversation.context.join('\n\n'),
              ])
              await ctx.telegram.sendMessage(data.superAdminId, message)
            }
          })
    }
  }
}