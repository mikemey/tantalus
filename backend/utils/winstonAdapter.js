const winston = require('winston')

const { createLogger, format, transports } = winston

const WinstonAdapter = filename => {
  const winstonLogger = createLogger({
    format: format.printf(info => info.message),
    transports: [new transports.File({ filename })]
  })

  return {
    info: msg => winstonLogger.info(msg),
    log: obj => winstonLogger.info(JSON.stringify(obj, null, ' ')),
    error: (msg, err) => {
      winstonLogger.error(msg)
      if (err) winstonLogger.error(err.stack)
    }
  }
}

module.exports = WinstonAdapter
