const moment = require('moment')

const KEEP_ALIVE_MESSAGE_MINUTES = 15

const greenText = msg => `\x1b[92m${msg}\x1b[0m`
const redText = msg => `\x1b[91m${msg}\x1b[0m`
const darkText = msg => `\x1b[90m${msg}\x1b[0m`
const lightText = msg => `\x1b[97m${msg}\x1b[0m`
const highlightText = msg => `\x1b[1m${msg}\x1b[0m`

const colors = [31, 32, 33, 34, 35, 36, 90, 91, 92, 93, 94, 95, 96, 97]
const pickColor = () => colors[Math.floor(Math.random() * colors.length)]

const randomColorText = msg => `\x1b[${pickColor()}m${msg}\x1b[0m`

const TantalusLogger = (baseLogger, category, colorFunc) => {
  const statics = category
    ? {
      categoryTemplate: colorFunc
        ? ` [${colorFunc(category)}]`
        : ` [${randomColorText(category)}]`,
      timeStampFormat: 'YYYY-MM-DD HH:mm:ss'
    }
    : {
      categoryTemplate: '',
      timeStampFormat: '[[]YYYY-MM-DD HH:mm:ss[]]'
    }

  const data = {
    lastAlive: moment.utc(0)
  }

  const logWithBaseTemplate = logFunc => (message, err) => {
    updateLastAlive()
    logFunc(`${timeStamp()}${statics.categoryTemplate} ${message}`, err || '')
  }
  const updateLastAlive = () => { data.lastAlive = moment.utc() }
  const timeStamp = () => moment.utc().format(statics.timeStampFormat)

  const info = logWithBaseTemplate(baseLogger.info)
  const error = logWithBaseTemplate(baseLogger.error)
  const log = baseLogger.log

  const aliveMessage = () => {
    const now = moment.utc()
    if (now.diff(data.lastAlive, 'minutes') >= KEEP_ALIVE_MESSAGE_MINUTES) {
      info(darkText('alive'))
    }
  }

  return {
    baseLogger,
    info,
    error,
    log,
    aliveMessage
  }
}

module.exports = {
  TantalusLogger,
  greenText,
  redText,
  darkText,
  lightText,
  highlightText
}
