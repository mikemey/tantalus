const requests = require('../utils/requests')

const TransactionsConnector = (logger, config) => {
  return {
    getTransactions: () => requests
      .getJson(config.transactionListServiceUrl)
      .then(result => result.transactionsList)
  }
}
module.exports = TransactionsConnector
