var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
const User = require('../models/user');
const config = require('../config');
const authenticate = require('../authenticate');
const nodemailer = require('nodemailer');
const Request = require('../models/ambassadorReq');
const { request } = require('express');
const Invite = require('../models/invites');
const invites = require('../models/invites');
require('dotenv').config();

router.route('/')
.get(authenticate.verifyUser, (req, res, next)=>
{
  res.sendStatus = 200;
  var viewData = 
  {
    admin: req.user.admin,
    ca: req.user.campusAmbassador,
    points: req.user.points,
    flashMessage: 
      {
        success: req.flash('success'),
        error: req.flash('error')
      }
  };
  res.render('ambassador', viewData);
});

//this route for the admins to fetch the list of campus ambassadors
router.route('/list')
.get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{
    User.find({campusAmbassador: true})
    .then((users)=>
    {
      res.statusCode = 200;
      var viewData = 
      {
        listOf: 'all Campus Ambassadors',
        users: users
      };
      res.statusCode = 200;
      res.render('users',viewData);
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
    var viewData = 
    {
      listOf: 'your College users',
      users: users
    };
    res.statusCode = 200;
    res.render('users',viewData);

  }, (err)=>next(err))
  .catch((err)=>next(err));
});

router.route('/requests')
.get(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{
  //admins can see all the requests posted by users to be campus ambassadors
  Request.find({})
  .populate('user')
  .then((requests)=>
  {
    res.statusCode = 200;
    var viewData = 
    {
      listOf: 'all requests to be Campus Ambassador',
      requests: requests,
      flashMessage: 
      {
        success: req.flash('success'),
        error: req.flash('error')
      }
    };
    res.statusCode = 200;
    res.render('requests',viewData);
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
        req.flash('error', 'You have already posted a request and it\'s being reviewed');
        res.redirect('/campusAmbassadors');
      }

      else
      {
        var request = new Request({user: req.user._id});
        request.save()
        .then((request)=>
        {
          res.statusCode = 200;
          req.flash('success', 'Your request has been posted successfully');
          res.redirect('/campusAmbassadors');
        },(err)=>next(err));
      }
    },(err)=>next(err))
    .catch((err)=>next(err));
  }

  else
  {
    res.statusCode = 400;
    req.flash('error', 'You are already a Ambassador');
    res.redirect('/campusAmbassadors');
  }
});
router.route('/requests/delete')
.post(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{//admins can remove all the requests
  Request.remove({})
  .then((requests)=>
  {
    res.statusCode=200;
    req.flash('success', 'Deleted all the requests.');
    res.redirect('/campusAmbassadors/requests');
  },(err)=>next(err))
  .catch((err)=>next(err));
});

router.route('/requests/:reqID')
.post(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{//this is to accept the request
  Request.findOne({_id: req.params.reqID})
  .then((request)=>
  {
      User.findOne({_id: request.user})
      .then((user)=>
      {
        user.campusAmbassador = true;
        user.save();
      },(err)=>next(err));
  },(err)=>next(err))
  .catch((err)=>next(err))

  Request.findByIdAndRemove(req.params.reqID)
  .then((request)=>
  {
    res.statusCode = 200;
    req.flash('success', 'Accepted the request. The user is now a Campus Ambassador.');
    res.redirect('/campusAmbassadors/requests');
  },(err)=>next(err))
  .catch((err)=>next(err));
})

router.route('/requests/:reqID/delete')
.post(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{//admins can delete a particular request
  Request.findByIdAndRemove(req.params.reqID)
  .then((request)=>
  {
    res.statusCode = 200;
    req.flash('success', 'Declined the users request to be a Campus Ambassador');
    res.redirect('/campusAmbassadors/requests');
  },(err)=>next(err))
  .catch((err)=>next(err));
});

router.route('/makeCampusAmbassador')
.post(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{
  //admins can make users campus ambassadors directly by using the username of the user
  User.findOne({username: req.body.username})
  .then((user)=>
  {
    if(user.campusAmbassador == true)
    {
      res.statusCode = 400;
      req.flash('error', ''+user.username + ' is already a Campus Ambassador');
      res.redirect('/campusAmbassadors');
    }

    else
    {
      user.campusAmbassador = true;
      user.save()
      .then((user)=>
      {
        res.statusCode = 200;
        req.flash('success', ''+user.username + ' is now a campus ambassador');
        res.redirect('/campusAmbassadors');
      },(err)=>next(err));
    }
  },(err)=>next(err))
  .catch((err)=>next(err));
});

router.route('/invite')
.post(authenticate.verifyUser, authenticate.verifyCampusAmbassador, (req, res, next)=>
{//campus ambassadors can send invites using email

  Invite.exists({user: req.user._id, email: req.body.email})
  .then((result)=>
  {
    if(result)
    {//only one invite to one user per campus ambassador
      res.statusCode = 400;
      req.flash('error', 'You have already sent an invite to this email');
      res.redirect('/campusAmbassadors');
      return;
    }

    else
    {
      var inv = new Invite({user: req.user._id, email: req.body.email});
      inv.save();

      var transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: config.email , pass: process.env.PASSWORD } });
      var link = 'http:\/\/' + req.headers.host +'\/campusAmbassadors\/invite\/'+req.user._id + '\/' + req.body.email;
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
        req.flash('success', 'Invitation sent to ' + req.body.email);
        res.redirect('/campusAmbassadors');
      });
    }
  }, (err)=>next(err))
  .catch((err)=>next(err));
});

router.route('/invite/:userID/:email')
.post((req, res, next)=>
{
  Invite.findOne({user: req.params.userID, email: req.params.email})
  .then((invite)=>
  {
    if(invite.accepted == true)
    {
      res.redirect('http:\/\/' + req.headers.host);
    }

    else
    {
      invite.accepted = true;
      invite.save()
      .then((invite)=>
      {
        User.findOne({_id: invite.user})
        .then((user)=>
        {
          user.points++;
          user.save()
          .then((user)=>
          {
            res.redirect('http:\/\/' + req.headers.host);
          }, (err)=>next(err));
        }, (err)=>next(err));
      }, (err)=>next(err))
      .catch((err)=>next(err));
    }
  });

});

module.exports = router;