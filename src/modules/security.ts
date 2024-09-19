import Module from '@src/module.js'

export default class extends Module {
  setup() {
    this.commands.security = {
      description: 'Безопасность',
      access: ['privateAll', 'groupAll'],
      addToList: 20,
      func: (ctx) => {
        void ctx.reply('Безопасность')
      }
    }
  }
}