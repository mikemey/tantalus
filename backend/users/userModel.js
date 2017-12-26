const { mongoose } = require('../../utils/mongoConnection')

const passportLocalMongoose = require('passport-local-mongoose')

// ----------- Account
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

// ----------- Keys
const UserKeysSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  keys: []
}, {
  usePushEach: true
})

UserKeysSchema.index({ userId: 1 })
UserKeysSchema.query.byUserId = function (userId) {
  return this.findOne({ userId })
}

const UserKeys = mongoose.model('UserKeys', UserKeysSchema)

module.exports = { Account, UserKeys }
