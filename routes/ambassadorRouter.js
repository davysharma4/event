var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
const User = require('../models/user');
const config = require('../config');
const authenticate = require('../authenticate');
const nodemailer = require('nodemailer');
const Request = require('../models/ambassadorReq');
const { request } = require('express');
require('dotenv').config();

router.route('/')
.get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{
    User.find({campusAmbassador: true})
    .then((users)=>
    {
      res.statusCode = 200;
      res.setHeader('Content-Type','application/json');
      res.json(users);
    }, (err)=>next(err))
    .catch((err)=>next(err));
});

router.route('/myCollegeUsers')
.get(authenticate.verifyUser, authenticate.verifyCampusAmbassador, (req, res, next)=>
{
  User.find({college: req.user.college})
  .then((users)=>
  {
    res.statusCode = 200;
    res.setHeader('Content-Type','application/json');
    res.json(users);
  }, (err)=>next(err))
  .catch((err)=>next(err));
});

router.route('/requests')
.get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{
  Request.find({})
  .then((requests)=>
  {
    res.statusCode = 200;
    res.setHeader('Content-Type','application/json');
    res.json(requests);
  },(err)=>next(err))
  .catch((err)=>next(err));
})
.post(authenticate.verifyUser,  (req, res, next)=>
{
  if(req.user.campusAmbassador == false)
  {
    Request.exists({user: req.user._id})
    .then((result)=>
    {
      if(result)
      {
        res.statusCode = 400;
        res.setHeader('Content-Type','application/json');
        res.json({success: true, status: "Your request already exists"});
      }

      else
      {
        var request = new Request({user: req.user._id});
        request.save()
        .then((request)=>
        {
          res.statusCode = 200;
          res.setHeader('Content-Type','application/json');
          res.json({success: true, status: "Request posted successfully"});
        },(err)=>next(err));
      }
    },(err)=>next(err))
    .catch((err)=>next(err));
  }

  else
  {
    res.statusCode = 400;
    res.setHeader('Content-Type','application/json');
    res.json({success: false, status: "You are already a campus ambassador"});
  }
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{
  Request.remove({})
  .then((requests)=>
  {
    res.statusCode=200;
    res.setHeader('Content-Type','Application/JSON');
    res.json(requests);
  },(err)=>next(err))
  .catch((err)=>next(err));
});

router.route('/requests/:reqID')
.get(authenticate.verifyUser, authenticate.verifyUser, (req, res, next)=>
{
  Request.findOne({_id: req.params.reqID})
  .then((request)=>
  {
    res.statusCode = 200;
    res.setHeader('Content-Type','application/json');
    res.json(request);
  },(err)=>next(err))
  .catch((err)=>next(err));
})
.put(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{
  var accepted = "Request declined";
  Request.findOne({_id: req.params.reqID})
  .then((request)=>
  {
    if(req.body.accept == true)
    {
      accepted = "Request accepted";
      User.findOne({_id: request.user})
      .then((user)=>
      {
        user.campusAmbassador = true;
        user.save();
      },(err)=>next(err));
    }
  },(err)=>next(err))
  .catch((err)=>next(err))

  Request.findByIdAndRemove(req.params.reqID)
  .then((request)=>
  {
    res.statusCode = 200;
    res.setHeader('Content-Type','application/json');
    res.json({status: accepted});
  },(err)=>next(err))
  .catch((err)=>next(err));
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{
  Request.findByIdAndRemove(req.params.reqID)
  .then((request)=>
  {
    res.statusCode = 200;
    res.setHeader('Content-Type','application/json');
    res.json(request);
  },(err)=>next(err))
  .catch((err)=>next(err));
});

router.route('/makeCampusAmbassador')
.put(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{
  User.findOne({username: req.body.username})
  .then((user)=>
  {
    if(user.campusAmbassador == true)
    {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.json({status: 'User is already a campus ambassador'});
    }

    else
    {
      user.campusAmbassador = true;
      user.save()
      .then((user)=>
      {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json({status: 'User is now a campus ambassador'});
      },(err)=>next(err));
    }
  },(err)=>next(err))
  .catch((err)=>next(err));
});

router.route('/invite')
.post(authenticate.verifyUser, authenticate.verifyCampusAmbassador, (req, res, next)=>
{
  if(req.user.invites.includes(req.body.email))
  {
    res.statusCode = 400;
    res.setHeader('Content-type','application/json');
    res.json({status: 'You already invited this user'});
    return;
  }
  
  (req.user.invites).push(req.body.email);
  req.user.save();
  var transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: config.email , pass: process.env.PASSWORD } });
  var link = 'http:\/\/' + req.headers.host +'\/campusAmbassadors\/invite\/'+req.user.username + '\/' + req.body.email;
  var name = req.user.firstname + " " + req.user.lastname ;
  var mailOptions =
  {
    from: config.email,
    to: req.body.email,
    subject: 'College Event Invitation',
    html: '<p>'+name+' invited you to our college festival. Visit Now!!</p><form action="'+
    link+'" method="post"><input type="submit" value="Visit"></form>'
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
    res.json({success: true, status: 'Invited ' + req.body.name});

  });
});

router.route('/invite/:username/:email')
.post((req, res, next)=>
{
  User.findOne({username: req.params.username})
  .then((user)=>
  {
    if(!user.invites.includes(req.params.email))
    user.points++;

    user.save()
    .then((user)=>
    {
      res.statusCode = 200;
      res.redirect('http:\/\/' + req.headers.host);
    },(err)=>next(err))
  },(err)=>next(err))
  .catch((err)=>next(err));
});

module.exports = router;