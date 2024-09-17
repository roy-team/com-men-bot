import { Sequelize } from 'sequelize'
import type { ModelAttributes } from 'sequelize/lib/model'

let sequelize: Sequelize
const dbType = process.env.DB_TYPE ?? ''
const dbHost = process.env.DB_HOST
const dbUser = process.env.DB_USER
const dbPass = process.env.DB_PASS
const dbName = process.env.DB_NAME

switch (dbType) {
  case 'sqlite':
    if (dbName === undefined) {
      console.error('Wrong DB_NAME')
      process.exit(1)
    }

    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_NAME,
    })
    break
  case 'mariadb':
    if (dbHost === undefined) {
      console.error('Wrong DB_HOST')
      process.exit(1)
    }

    if (dbUser === undefined) {
      console.error('Wrong DB_USER')
      process.exit(1)
    }

    if (dbPass === undefined) {
      console.error('Wrong DB_PASS')
      process.exit(1)
    }

    if (dbName === undefined) {
      console.error('Wrong DB_NAME')
      process.exit(1)
    }

    sequelize = new Sequelize({
      dialect: 'mariadb',
      storage: process.env.DB_NAME,
    })
    break
  default:
    console.error('Wrong DB_TYPE')
    process.exit(1)
}

function initModel(name: string, attributes: ModelAttributes) {
  sequelize.define(name, attributes)
}

export {
  sequelize,
  initModel,
}