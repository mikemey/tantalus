const requests = require('../utils/requests')

const ExchangeConnector = config => {
  const host = config.exchangeHost
  const clientId = encodeURIComponent(config.clientId)

  const openOrdersUrl = `${host}/${clientId}/open_orders`
  const buyOrdersUrl = `${host}/${clientId}/buy`
  const sellOrdersUrl = `${host}/${clientId}/sell`
  const cancelOrderUrl = `${host}/${clientId}/cancel_order`
  const transactionsUrl = `${host}/${clientId}/transactions`

  return {
    getOpenOrders: () => requests.getJson(openOrdersUrl),
    buyLimitOrder: (amount, price) => requests.postJson(buyOrdersUrl, { amount, price }),
    sellLimitOrder: (amount, price) => requests.postJson(sellOrdersUrl, { amount, price }),
    cancelOrder: id => requests.postJson(cancelOrderUrl, { id }),
    getTransactions: () => requests.getJson(transactionsUrl)
  }
}

module.exports = ExchangeConnector
