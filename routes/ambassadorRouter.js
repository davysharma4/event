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


//this route for the admins to fetch the list of campus ambassadors
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

//this route is for campus ambassadors to fetch the list of their college users
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
  //admins can see all the requests posted by users to be campus ambassadors
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
{//users can post requests to be campus ambassadors
  if(req.user.campusAmbassador == false)
  {//only non campus ambassadors can post requests
    Request.exists({user: req.user._id})
    .then((result)=>
    {//each user can post only 1 request
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
{//admins can remove all the requests
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
.get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{//admin can see a particular request
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
{//this operation either accepts or declines a request. if the accept field in body is true...then request is accepted
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
  {//after accepting or rejecting a request, the request is deleted
    res.statusCode = 200;
    res.setHeader('Content-Type','application/json');
    res.json({status: accepted});
  },(err)=>next(err))
  .catch((err)=>next(err));
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{//admins can delete a particular request
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
  //admins can make users campus ambassadors directly by using the username of the user
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
{//campus ambassadors can send invites using email
  if(req.user.invites.includes(req.body.email))
  {//only one invite to one user. We make an array of the emails to which user the campus ambassador has sent the request and check if that 
    //email is already in that array
    res.statusCode = 400;
    res.setHeader('Content-type','application/json');
    res.json({status: 'You already invited this user'});
    return;
  }
  
  (req.user.invites).push(req.body.email);
  req.user.save();
  var transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: config.email , pass: process.env.PASSWORD } });
  var link = 'http:\/\/' + req.headers.host +'\/campusAmbassadors\/invite\/'+req.user.username + '\/' + req.body.email;
  //the link contains the username of the campus ambassador and the email to which invite is send. They'll be used later.
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
  {//we find the campus ambassador who sent the request and give him a point.
    if(!user.invites.includes(req.params.email))
    user.points++;
    //the if statement above is used to prevent the scenario where an invited person clicks on a link repeatedly and it gives multiple points
    //to the campus ambassador for a single invite

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