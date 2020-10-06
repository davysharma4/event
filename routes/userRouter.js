var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
const User = require('../models/user');
const passport = require('passport');
const authenticate = require('../authenticate');
const Token = require('../models/verifyToken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

router.route('/')
.get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{
  User.find({})
  .then((users)=>
  {
      res.statusCode=200;
      res.setHeader('Content-Type','Application/JSON');
      res.json(users);
  },(err)=>next(err))
  .catch((err)=>next(err));
});


router.post('/signup', (req, res, next) => {
  User.register(new User({username: req.body.username, emailID: req.body.emailID}), 
    req.body.password, (err, user) => {
    if(err)
    {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.json({err: err});
    }
    else
    {
      if (req.body.firstname)
        user.firstname = req.body.firstname;
      if (req.body.lastname)
        user.lastname = req.body.lastname;

      user.save((err, user) =>
      {
        if (err)
        {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.json({err: err});
          return;
        }
        else
        {
          var token = new Token({user: user._id, token: crypto.randomBytes(16).toString('hex')});
          token.save((err, token)=>
          {
            if (err)
            {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.json({err: err});
              return;
            }
 
            var transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: 'hikigayadoeswebster@gmail.com', pass: process.env.PASSWORD } });
            var link = 'http:\/\/' + req.headers.host + '\/users\/confirmation\/' + token.token;
            var mailOptions =
            {
              from: 'process.env.USERNAME',
              to: user.emailID,
              subject: 'Account Verification Token',
              html: '<p>Please verify your account by clicking the button</p><form action="'+
              link+'" method="post"><input type="submit" value="Verify"></form>'
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
              res.json({success: true, status: 'A verification email has been sent to ' + user.emailID});
            });
          });
        }
      });
    }
  });
});

router.post('/confirmation/:token', (req, res, next)=>
{
  Token.findOne({token: req.params.token})
  .then((token)=>
  {
    User.findOne({_id: token.user})
    .then((user)=>
    {
      if(user.emailVerified == true)
      {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.json({status: 'You are already verified'});
      }

      else
      {

        user.emailVerified = true;
        user.save()
        .then((user)=>
        {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.json({status: 'You are successfully verified'});
        },(err)=>next(err));
      }
    },(err)=>next(err));
  },(err)=>next(err))
  .catch((err)=>next(err));
});

router.post('/resendVerifyToken',  passport.authenticate('local'), (req, res, next)=>
{
  var token = new Token({user: req.user._id, token: crypto.randomBytes(16).toString('hex')});
  token.save((err, token)=>
  {
    if (err)
    {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.json({err: err});
      return;
    }

    var transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: 'hikigayadoeswebster@gmail.com', pass: process.env.PASSWORD } });
    var link = 'http:\/\/' + req.headers.host + '\/users\/confirmation\/' + token.token;
    var mailOptions =
    {
      from: 'process.env.USERNAME',
      to: req.user.emailID,
      subject: 'Account Verification Token',
      html: '<p>Please verify your account by clicking the button</p><form action="'+
      link+'" method="post"><input type="submit" value="Verify"></form>'
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
      res.json({success: true, status: 'A verification email has been sent to ' + req.user.emailID});
    });
  });
});

router.post('/login', passport.authenticate('local'), (req, res) => {
  if(req.user.emailVerified == true)
  {
    var token = authenticate.getToken({_id: req.user._id});
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.json({success: true, token: token, status: 'You are successfully logged in!'});
  }
  else
  {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.json({success: false, status: 'Please verify your email first'});
  }

  });

  module.exports = router;
