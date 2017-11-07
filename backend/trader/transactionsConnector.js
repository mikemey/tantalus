const requests = require('../utils/requests')

const TransactionsConnector = config => {
  return {
    getTransactions: () => requests
      .getJson(config.transactionListServiceUrl)
      .then(result => result.transactionsList)
  }
}
module.exports = TransactionsConnector
