import Module from '@src/module.js'

export default class extends Module {
  setup() {
    this.commands.knowledgebase = {
      description: 'База знаний',
      access: ['privateAll', 'groupAll'],
      addToList: 50,
      func: (ctx) => {
        void ctx.reply('База знаний')
      }
    }
  }
}