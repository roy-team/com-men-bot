import Module from '@src/module.js'

export default class extends Module {
  setup() {
    this.commands.offers = {
      description: 'Предложения',
      access: ['privateAll', 'groupAll'],
      addToList: 40,
      func: (ctx) => {
        void ctx.reply('Предложения')
      }
    }
  }
}