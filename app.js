var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mongoose = require('mongoose');
const config = require('./config');
const url = config.mongoURL;
var passport = require('passport');


require('dotenv').config();


var indexRouter = require('./routes/index');
var userRouter = require('./routes/userRouter');
var ambassadorRouter = require('./routes/ambassadorRouter');
var forgotRouter = require('./routes/forgotRouter');
var eventRouter = require('./routes/eventRouter');
const { mongo, Mongoose } = require('mongoose');
const { db } = require('./models/user');


mongoose.connect(url)
.then((db)=>
{
  console.log("Connected to database");
},(err)=>{console.log(err);});

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', userRouter);
app.use('/campusAmbassadors', ambassadorRouter);
app.use('/forgot', forgotRouter);
app.use('/event', eventRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
