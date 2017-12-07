const moment = require('moment')

const timestamp = unixDate => moment.unix(unixDate).format('DD.MM.YYYY HH:mm:ss')

const quietLogger = { info: () => { } }

module.exports = {
  timestamp,
  quietLogger
}
