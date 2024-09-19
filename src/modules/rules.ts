import Module from '@src/module.js'

export default class extends Module {
  setup() {
    this.commands.rules = {
      description: 'Правила',
      access: ['privateAll', 'groupAll'],
      addToList: 10,
      func: (ctx) => {
        void ctx.reply('Правила')
      }
    }
  }
}