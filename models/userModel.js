const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name.'],
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    trim: [true, 'Please provide your email.'],
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email.'],
  },
  photo: String,
  password: {
    type: String,
    required: [true, 'Please enter your password.'],
    minlength: [6, 'Minimum password length is 6 character.'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password!'],
    validate: {
      // only works on save() and create()
      validator: function (el) {
        return this.password === el;
      },
      message: 'Passwords are not the same.',
    },
  },
  passwordChangedAt: Date,
});

userSchema.pre('save', async function (next) {
  // only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  // delete the password confirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePasswrod,
  userPassword
) {
  return await bcrypt.compare(candidatePasswrod, userPassword);
};

userSchema.methods.changedPassordAfter = function (JWTTimestimep) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangeAt.getTime() / 1000,
      10
    );
    return JWTTimestimep < changedTimestamp;
  }

  // false means not changed
  return false;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
