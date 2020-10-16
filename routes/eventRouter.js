const express = require('express');
const bodyParser = require('body-parser');
const authenticate = require('../authenticate');
const multer = require('multer');
const router = express.Router();
const fs =  require('fs');
const path = require('path');
const Event = require('../models/event');
const event = require('../models/event');
const Comment = require('../models/comment');

const storage = multer.diskStorage(
{
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },

    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
});
//Only image files will be uploaded
const imageFileFilter = (req, file, cb)=>
{
    if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/))
        return cb(new Error('You can upload only image files!'), false);

    cb(null, true);
}

const upload = multer({ storage: storage, fileFilter: imageFileFilter});

router.route('/')
.get((req, res, next)=>
{//Anyone can see the posts
    Event.find({})
    .then((event)=>
    {
        
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(event);
        
    }, (err)=>next(err))
    .catch((err)=>next(err));
})
.post(authenticate.verifyUser, authenticate.verifyAdmin, upload.single('image'), (req, res, next)=>
{//Only admins can post
    var event = new Event(   
    { 
        name: req.body.name, 
        description: req.body.description,
        //We store the path so that images can be accessed later
        img: path.join(__dirname + '/../public/images/' + req.file.filename)
    });


    event.save()
    .then((event)=>
    {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(event);
    }, (err)=>next(err))
    .catch((err)=>next(err));

})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{//Admins can delete all events at once
    Event.remove({})
    .then((events)=>
    {
        res.statusCode=200;
        res.setHeader('Content-Type','Application/JSON');
        res.json(events);
    }, (err)=>next(err))
    .catch((err)=>next(err));
});

router.route('/:eventID')
.get((req, res, next)=>
{
    Event.findOne({_id: req.params.eventID})
    .then((event)=>
    {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(event);
        
    }, (err)=>next(err))
    .catch((err)=>next(err));
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>
{
    Event.findByIdAndRemove({_id: req.params.eventID})
    .then((event)=>
    {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(event);
        
    }, (err)=>next(err))
    .catch((err)=>next(err));
});

//This handles the comments posted
router.route('/:eventID/comments')
.get((req, res, next)=>
{//Anyone can see the comments
    Comment.find({})
    .populate('user')
    .then((comments)=>
    {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(comments);
    }, (err)=>next(err))
    .catch((err)=>next(err));
})
.post(authenticate.verifyUser, (req, res, next)=>
{//Only registered users can post comments
    var comment = new Comment(
    {
        user: req.user._id,
        comment: req.body.comment,
        event: req.params.eventID
    });
    
    comment.save()
    .then((comment)=>
    {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(comment);
    }, (err)=>next(err))
    .catch((err)=>next(err));
});

router.route('/:eventID/comments/:commentID')
.delete(authenticate.verifyUser, (req, res, next)=>
{
    Comment.findOne({_id: req.params.commentID})
    .then((comment)=>
    {
        //Users can delete only their own comments
        var str1 = '';
        str1 = str1 + req.user._id;
        var str2 = '';
        str2 = str2 + comment.user;
        if(str1 ===str2)
        {
            comment.remove()
            .then((comment)=>
            {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(comment);
            }, (err)=>next(err))
            .catch((err)=>next(err));
        }
        else
        {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.json({status: 'This is not your comment'});
        }
    }, (err)=>next(err))
    .catch((err)=>next(err));
});

module.exports = router;