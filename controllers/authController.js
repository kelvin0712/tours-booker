const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/userModel');
const catchSync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signup = catchSync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  const token = signToken(newUser._id);

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser,
    },
  });
});

exports.login = catchSync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1.Checkj if email and password exists
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2. Check if the user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3. send token to client
  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1. Get token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in!', 401));
  }

  // 2. Varify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Check if user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError(
        'The user belonging to this token does not longer exist',
        401
      )
    );
  }
  // 4. Check if user changed password after the token was issued
  if (freshUser.changedPassordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please login again ', 401)
    );
  }

  req.user = freshUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide]
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on POSTED email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2. Generate random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3. Send it back aas an eamil
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}. \nIf you did not forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 mins)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error send the email. Try again later!'),
      500
    );
  }
});
