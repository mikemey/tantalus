const requests = require('../utils/requests')

const ExchangeConnector = config => {
  const host = config.exchangeHost
  const clientId = encodeURIComponent(config.clientId)

  const allAccountsUrl = `${host}/accounts`
  const transactionsUrl = `${host}/transactions`

  const accountUrl = `${host}/${clientId}/account`
  const openOrderUrl = `${host}/${clientId}/open_orders`
  const buyOrderUrl = `${host}/${clientId}/buy`
  const sellOrderUrl = `${host}/${clientId}/sell`
  const cancelOrderUrl = `${host}/${clientId}/cancel_order`

  return {
    getAllAccounts: () => requests.getJson(allAccountsUrl),
    getTransactions: () => requests.getJson(transactionsUrl),

    getAccount: () => requests.getJson(accountUrl),
    getOpenOrders: () => requests.getJson(openOrderUrl),
    buyLimitOrder: (amount, price) => requests.postJson(buyOrderUrl, { amount, price }),
    sellLimitOrder: (amount, price) => requests.postJson(sellOrderUrl, { amount, price }),
    cancelOrder: id => requests.postJson(cancelOrderUrl, { id })
  }
}

module.exports = ExchangeConnector
