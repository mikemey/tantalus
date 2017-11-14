const {
  darkText,
  highlightText,
  redText,
  greenText
 } = require('./tantalusLogger')

const mmBTC = 10000

const amountString = amount => `Ƀ ${(amount / mmBTC).toFixed(4)}`
const priceString = (price, unit = '£/Ƀ') => `${unit} ${(price / 100).toFixed(2)}`
const amountPriceString = (amount, price) => `${amountString(amount)} - ${priceString(price)}`

const volumeString = volume => priceString(volume, '£')

const floorVolume = (amount, price) => Math.floor(amount * price / mmBTC)
const reverseVolume = (volume, amountOrPrice) => Math.floor(volume / amountOrPrice * mmBTC)
const floorAmount = reverseVolume
const floorPrice = reverseVolume

const orderName = order => order.type === BUY_ORDER_TYPE ? 'BUY' : 'SELL'
const BOUGHT_MSG = 'B'
const SOLD_MSG = 'S'

// order type: (0 - buy; 1 - sell)
const BUY_ORDER_TYPE = 0
const SELL_ORDER_TYPE = 1
const isBuyOrder = order => order.type === BUY_ORDER_TYPE
const isSellOrder = order => order.type === SELL_ORDER_TYPE

const OrderLogger = baseLogger => {
  const logNewOrder = order => baseLogger.info(darkText(
    `${orderName(order)} [${order.id}]: ${amountPriceString(order.amount, order.price)}`
  ))

  const logCancelledOrder = order => baseLogger.info(
    darkText(`${orderName(order)} [${order.id}]:`) + highlightText(' cancelled')
  )

  const logOrderBought = (orderId, amount, price) => baseLogger.info(redText(
    `${BOUGHT_MSG} [${orderId}]: ${amountPriceString(amount, price)}`
  ))

  const logOrderSold = (orderId, amount, price) => baseLogger.info(greenText(
    `${SOLD_MSG} [${orderId}]: ${amountPriceString(amount, price)}`
  ))

  return Object.assign({}, baseLogger, {
    logNewOrder,
    logCancelledOrder,
    logOrderBought,
    logOrderSold
  })
}

module.exports = {
  BUY_ORDER_TYPE,
  SELL_ORDER_TYPE,
  mmBTC,
  floorVolume,
  floorAmount,
  floorPrice,
  amountString,
  volumeString,
  isBuyOrder,
  isSellOrder,
  OrderLogger
}
