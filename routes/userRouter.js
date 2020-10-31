var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
const User = require('../models/user');
const passport = require('passport');
const authenticate = require('../authenticate');
const Token = require('../models/verifyToken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const config = require('../config');
require('dotenv').config();

//gives admin the privilege to fetch a list of users
router.route('/')
.get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{
  User.find({})
  .then((users)=>
  {
      res.statusCode=200;
      var viewData = 
      {
        listOf: 'all the users',
        users: users
      };
      res.statusCode = 200;
      res.render('users',viewData)
  },(err)=>next(err))
  .catch((err)=>next(err));
});

//signing up users
router.post('/signup', (req, res, next) => {
  User.register(new User({username: req.body.username, emailID: req.body.emailID}), 
    req.body.password, (err, user) => {
    if(err)
    {
      res.statusCode = 500;
      req.flash('error', 'Username or email already taken');
      res.redirect('/');
    }
    else
    {
      //setting the first name and lastname of the user
      if (req.body.firstname)
        user.firstname = req.body.firstname;
      if (req.body.lastname)
        user.lastname = req.body.lastname;

      user.save((err, user) =>
      {
        if (err)
        {
          res.statusCode = 500;
          req.flash('error', err.message);
          res.redirect('/');
          return;
        }
        else
        {
          //this is send an email to the user to verify the email ID entered
          var token = new Token({user: user._id, token: crypto.randomBytes(16).toString('hex')});
          //we generate a token to the user

          token.save((err, token)=>
          {
            if (err)
            {
              res.statusCode = 500;
              req.flash('error', err.message);
              res.redirect('/');
              return;
            }
            
            //we attach the token in the link as a param. So when the user clicks the button, he/she is redirected to confirmation token route
            var transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: config.email, pass: process.env.PASSWORD } });
            var link = 'http:\/\/' + req.headers.host + '\/users\/confirmation\/' + token.token;
            var mailOptions =
            {
              from: config.email,
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
                req.flash('error', err.message);
                res.redirect('/');
                return;
              }
              
              res.statusCode = 200;
              req.flash('success', 'A verification email has been sent to ' + user.emailID+'. Please verify your Email ID.');
              res.redirect('/');
            });
          });
        }
      });
    }
  });
});

//we see if the token in the request param matches any token in our database 
router.post('/confirmation/:token', (req, res, next)=>
{
  Token.findOne({token: req.params.token})
  .then((token)=>
  {
    //after finding a token, we find the user attached to it
    User.findOne({_id: token.user})
    .then((user)=>
    {
      if(user.emailVerified == true)
      {
        //This is in case user generates another token or click the same link again
        res.statusCode = 400;
        req.flash('error', 'Your email has already been verified');
        res.redirect('/');
      }

      else
      {
        //if user is not verified we verify him
        user.emailVerified = true;
        user.save()
        .then((user)=>
        {
          res.statusCode = 200;
          req.flash('success', 'Your email has been verified successfully');
          res.redirect('/');
        },(err)=>next(err));
      }
    },(err)=>next(err));
  },(err)=>next(err))
  .catch((err)=>next(err));
});

//This is required if the user fails to open the link sent via mail in specified time
router.post('/resendVerifyToken',  passport.authenticate('local'), (req, res, next)=>
{
  if(req.user.emailVerified == true)
  {
    //This is in case user generates another token or click the same link again
    res.statusCode = 400;
    req.flash('error', 'Your email has already been verified');
    res.redirect('/');
  }
  var token = new Token({user: req.user._id, token: crypto.randomBytes(16).toString('hex')});
  token.save((err, token)=>
  {
    if (err)
    {
      res.statusCode = 500;
      req.flash('error', err.message);
      res.redirect('/');
      return;
    }

    var transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: config.email , pass: process.env.PASSWORD } });
    var link = 'http:\/\/' + req.headers.host + '\/users\/confirmation\/' + token.token;
    var mailOptions =
    {
      from: config.email,
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
        req.flash('error', err.message);
        res.redirect('/');
        return;
      }
      
      res.statusCode = 200;
      req.flash('success', 'A verification email has been sent to ' + req.user.emailID+'. Please verify your Email ID.')
      res.redirect('/');
    });
  });
});

router.post('/login', (req, res, next) =>
{
  passport.authenticate('local', (err, user)=>
  {
    if(err)
    {
      res.statusCode = 500;
      return next(err);
    }
    if(!user)
    {
      res.statusCode = 401;
      req.flash('error', 'Invalid username or password');
      res.redirect('/');
    }
    req.login(user, (err)=>{
      if(err)
      {
        res.statusCode = 500;
        return next(err);
      }
      if(req.user.emailVerified == true)
      {//we only only verified users to login. We generate a JWT to the verified users
        var token = authenticate.getToken({_id: req.user._id});
        res.statusCode = 200;
        res.cookie('token', token, { httpOnly: true, maxAge: 3600*24*1000});
        req.flash('success', 'You are successfully logged in!');
        res.redirect('/');
      }
      else
      {
        res.statusCode = 401;
        req.flash('error', 'Please verify your email before logging in');
        res.redirect('/');
      }
    });
  })(req, res, next);
  });

router.get('/logout', (req, res, next)=>
{
  res.clearCookie('token');
  res.statusCode = 200;
  req.flash('success', 'Logged you out successfully');
  res.redirect('/');
})

  //google signup/login. Scope mentions the required details of the user 
  router.get('/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

  //this is where the user is redirected after authentication with google
  router.get('/google/callback', passport.authenticate('google'), (req, res)=>
  {
    if (req.user)
    {//if the user is found or created we generate a JWT for further requests
      var token = authenticate.getToken({_id: req.user._id});
      res.statusCode = 200;
      res.cookie('token', token, { httpOnly: true , maxAge: 3600*24*1000});
      req.flash('success', 'You are successfully logged in!');
      res.redirect('/');
    }
  });

  module.exports = router;
