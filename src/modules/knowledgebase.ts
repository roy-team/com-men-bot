import Module from '@src/module.js'

// noinspection JSUnusedGlobalSymbols
export default class extends Module {
  setup() {
    this.commands.knowledgebase = {
      title: 'База знаний',
      access: ['privateAll', 'groupAll'],
      addToList: 50,
      func: (ctx) => {
        void ctx.reply('База знаний')
      }
    }
  }
}