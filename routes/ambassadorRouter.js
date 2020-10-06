var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
const User = require('../models/user');
const authenticate = require('../authenticate');
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

module.exports = router;