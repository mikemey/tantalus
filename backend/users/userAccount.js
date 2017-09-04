const mongoose = require('mongoose')
mongoose.Promise = Promise
const passportLocalMongoose = require('passport-local-mongoose')

const AccountSchema = new mongoose.Schema({
  username: String,
  password: String
})

AccountSchema.plugin(passportLocalMongoose)

const Account = mongoose.model('Account', AccountSchema)

const originalRegister = Account.register
const newRegister = (username, password) => new Promise((resolve, reject) => {
  originalRegister.call(Account, { username }, password, (err, account) => {
    if (err) reject(err)
    else resolve(account)
  })
})
Account.register = newRegister

module.exports = Account
