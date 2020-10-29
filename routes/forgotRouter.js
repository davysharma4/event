var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
const User = require('../models/user');
const passport = require('passport');
const authenticate = require('../authenticate');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const config = require('../config');
const ResetToken = require('../models/passwordResetToken');
require('dotenv').config();

router.route('/username')
.post((req, res, next)=>
{
    User.findOne({emailID: req.body.email})
    .then((user)=>
    {
      console.log(req.body.email);
        var transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: config.email , pass: process.env.PASSWORD } });
        var mailOptions =
        {
          from: config.email,
          to: req.body.email,
          subject: 'Forgot Username',
          text : 'Your username is: ' + user.username
        };
    
        transporter.sendMail(mailOptions, (err)=>
        {
          if (err)
          {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.json({err: err});
            return;
          }
          
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.json({success: true, status: 'An email with your username has been sent to ' + req.body.email});
        });
    }, (err)=>next(err))
    .catch((err)=>next(err));
});

router.route('/password')
.post((req, res, next)=>
{
    User.findOne({emailID: req.body.email})
    .then((user)=>
    {
        var token = new ResetToken({user: user._id, token: crypto.randomBytes(16).toString('hex')});
        token.save()
        .then((token)=>
        {
            var link = 'http:\/\/' + req.headers.host + '\/forgot' + '\/password\/' + token.token;
            var transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: config.email , pass: process.env.PASSWORD } });
            var mailOptions =
            {
              from: config.email,
              to: req.body.email,
              subject: 'Forgot Password',
              text : 'You\'ve been sent this mail because a reset password request has been generated via this emailID. Ignore this mail if'+
              ' it wasn\'t done by you.\nClick on the link below to change the password.\n' + link
            };
        
            transporter.sendMail(mailOptions, (err)=>
            {
              if (err)
              {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.json({err: err});
                return;
              }
              
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.json({success: true, status: 'An email has been sent to ' + req.body.email + 'giving further instructions'});
            });
        }, (err)=>next(err));
    }, (err)=>next(err))
    .catch((err)=>next(err));
});

router.route('/password/:token')
.get((req, res, next)=>
{
  ResetToken.findOne({token: req.params.token})
  .then((token)=>
  {
    res.statusCode = 200;
    viewData=
    {
      prToken: token.token
    }
    res.render('forgot', viewData);
  }, (err)=>next(err))
  .catch((err)=>next(err));
})
.post((req, res, next)=>
{
  ResetToken.findOne({token: req.params.token})
  .then((token)=>
  {
    User.findOne({_id: token.user})
    .then((user)=>
    {
      user.setPassword(req.body.password, ()=>
      {
        user.save();
        res.statusCode = 200;
        res.setHeader('Content-Type','application/json');
        res.json({status: 'Password has been reset successfully'});
      });
    }, (err)=>next(err));
  }, (err)=>next(err))
  .catch((err)=>next(err));
});

module.exports = router;