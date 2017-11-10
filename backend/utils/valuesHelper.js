const moment = require('moment')

const mBTC = 10000

const amountString = amount => `Ƀ ${(amount / mBTC).toFixed(4)}`
const priceString = (price, unit = '£/Ƀ') => `${unit} ${(price / 100).toFixed(2)}`

const volumeString = volume => priceString(volume, '£')

const floorVolume = (amount, price) => Math.floor(amount * price / mBTC)

const orderName = order => order.type === BUY_ORDER_TYPE ? 'BUY' : 'SELL'

// order type: (0 - buy; 1 - sell)
const BUY_ORDER_TYPE = 0
const SELL_ORDER_TYPE = 1
const isBuyOrder = order => order.type === BUY_ORDER_TYPE
const isSellOrder = order => order.type === SELL_ORDER_TYPE

const greenText = msg => `\x1b[92m${msg}\x1b[0m`
const redText = msg => `\x1b[91m${msg}\x1b[0m`
const darkText = msg => `\x1b[90m${msg}\x1b[0m`
const lightText = msg => `\x1b[97m${msg}\x1b[0m`

const createOrderLogger = (baseLogger, category) => {
  const categoryTemplate = category ? ` [${category}]` : ''

  const logWithBaseTemplate = logFunc => message => {
    const ts = moment().format('YYYY-MM-DD HH:mm:ss')
    logFunc(`${ts}${categoryTemplate} ${message}`)
  }

  const info = logWithBaseTemplate(baseLogger.info)
  const error = logWithBaseTemplate(baseLogger.error)

  const logNewOrder = order => info(darkText(
    `${orderName(order)} [${order.id}]: ${amountString(order.amount)} - ${priceString(order.price)}`
  ))

  const logCancelledOrder = order => info(
    darkText(`${orderName(order)} [${order.id}]:`) +
    lightText(' cancelled')
  )

  const logOrderBought = (amount, price) => info(redText(
    `BOUGHT: ${amountString(amount)} for ${priceString(price)}`
  ))

  const logOrderSold = (amount, price) => info(greenText(
    `SOLD: ${amountString(amount)} for ${priceString(price)}`
  ))

  return {
    info, error,
    logNewOrder,
    logCancelledOrder,
    logOrderBought,
    logOrderSold
  }
}

module.exports = {
  BUY_ORDER_TYPE,
  SELL_ORDER_TYPE,
  floorVolume,
  amountString,
  volumeString,
  createOrderLogger,
  isBuyOrder,
  isSellOrder
}
