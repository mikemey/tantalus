const moment = require('moment')
const { xterm } = require('cli-color')

const KEEP_ALIVE_MESSAGE_MINUTES = 15

const greenText = msg => xterm(10)(msg)
const redText = msg => xterm(9)(msg)
const darkText = msg => xterm(8)(msg)
const highlightText = msg => xterm(15)(msg)

const colors = [
  2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
  30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
  51, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
  75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95,
  96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113,
  114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 125, 126, 127, 128, 129, 130, 131,
  132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148,
  149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165,
  166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182,
  183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199,
  200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216,
  217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231
]

const pickColor = () => colors[Math.floor(Math.random() * colors.length)]

const randomColorText = msg => xterm(pickColor())(msg)

const ErrorTantalusLogger = (baseLogger) => {
  return {
    baseLogger,
    info: () => { },
    error: baseLogger.error,
    log: baseLogger.log,
    aliveMessage: () => { }
  }
}

const TantalusLogger = (baseLogger, category, categoryColorFunc) => {
  if (baseLogger.errorOnly) return ErrorTantalusLogger(baseLogger)

  const statics = category
    ? {
        categoryTemplate: categoryColorFunc
          ? ` [${categoryColorFunc(category)}]`
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
  highlightText
}
