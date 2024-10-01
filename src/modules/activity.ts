import Module from '@src/module.js'

export default class extends Module {
  setup() {
    this.commands.activity = {
      title: 'Моя активность',
      access: ['privateAll', 'groupAll'],
      addToList: 60,
      func: (ctx) => {
        void ctx.reply('Моя активность')
      }
    }
  }
}