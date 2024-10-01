import Module, { CommandContext, getUsername, isGroupMember, TextContext } from '@src/module.js'
import { getRegisterOptions } from '@src/modules/register.js'
import { TConversationData } from '@src/telegraf.js'

export default class extends Module {
  conversationTags = ['improvement']

  setup() {
    this.commands.offers = {
      title: 'Предложения по улучшению',
      access: ['privateAll'],
      addToList: 40,
      func: async (ctx: CommandContext) => {
        const data = await getRegisterOptions()

        // На всякий случай проверить, была ли регистрация чата
        if (data.superAdminId && data.groupId) {
          // Является ли автор членом группы
          if (!(await isGroupMember(this.bot, data.groupId, ctx.from.id))) {
            return
          }

          // Начать опрос по предложению
          void ctx.telegram.sendMessage(ctx.from.id, 'Опишите коротко суть предложения\n(Пожалуйста, дайте краткое описание вашего предложения, его целей и ожидаемого эффекта)\nВы можете прервать опрос используя команду /stop')
          this.bot.initConversation(ctx, 'improvement')
        }
      }
    }
  }

  onConversation(ctx: TextContext, conversation: TConversationData) {
    this.bot.addConversationContext(ctx.from.id, ctx.message.text)

    switch (conversation.step) {
      case 1:
        void ctx.reply('Напишите основные шаги, которые нужно сделать для реализации предложения\n(Опишите шаги или действия, которые помогут воплотить ваше предложение в жизнь. Какой порядок действий вы видите?)')
        break
      case 2:
        void ctx.reply('Кому это поможет?\n(Укажите, каким группам участников или аспектам сообщества ваше предложение принесет пользу)')
        break
      case 3:
        void ctx.reply('Отметьте, если для реализации нужны дополнительные ресурсы\n(Выберите необходимые ресурсы для выполнения предложенных шагов)\n' +
                       [
                         'Денежные средства',
                         'Привлечение юристов',
                         'Привлечение внимания СМИ',
                         'Либо напишите свой вариант',
                       ].join('\n'))
        break
      case 4:
        void ctx.reply('Как, по вашему мнению, вы лично можете участвовать в реализации предложения?\n(Поделитесь, какую роль вы готовы взять на себя для реализации вашего предложения. Это может быть организация, привлечение ресурсов или выполнение конкретных задач)')

        getRegisterOptions()
          .then(async (data) => {
            // На всякий случай проверить, была ли регистрация чата
            if (data.superAdminId && data.groupId) {
              // Отправить администратору информацию об авторе жалобы
              await ctx.telegram.sendMessage(data.superAdminId, 'Предложение от пользователя ' +
                                                                getUsername(ctx.from, true), {
                parse_mode: 'MarkdownV2',
              })

              // Отправить администратору информацию об опросе
              await ctx.telegram.sendMessage(data.superAdminId, 'Ответы на опрос:\n' +
                                                                conversation.context.join('\n------------------------------\n'))
            }
          })
    }
  }
}