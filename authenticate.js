require('dotenv').config();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('./models/user');
var jwt = require('jsonwebtoken');
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//creating a token which expires in a day
exports.getToken = (user) =>
{
    return jwt.sign(user, process.env.SECRET_KEY, {expiresIn: 3600*24});
}

var opts = {};
opts.jwtFromRequest = req => req.cookies.token;
opts.secretOrKey = process.env.SECRET_KEY;

passport.use(new JwtStrategy(opts, (jwt_payload, done) =>
    {
        User.findOne({_id: jwt_payload._id}, (err, user) => {
            if (err) {
                return done(err, false);
            }
            else if (user) {
                return done(null, user);
            }
            else {
                return done(null, false);
            }
        });
    }));

exports.verifyUser = passport.authenticate('jwt', {session: false});
//this generates req.user property whic is used to access the detials of the user

exports.verifyAdmin = (req, res, next)=>
{
    if (req.user.admin==true) {
        return next();
    }
    else {
        var err =  new Error ('You are not authorized as you are not an admin');
        err.status =  403;
        return next(err);
    }
}

exports.verifyCampusAmbassador = (req, res, next)=>
{
    if (req.user.campusAmbassador==true) {
        return next();
    }
    else {
        var err =  new Error ('You are not authorized as you are not a campus ambassador');
        err.status =  403;
        return next(err);
    }
}

exports.googlePassport = passport.use(new GoogleStrategy(
    {
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: "http://localhost:3000/users/google/callback"
    },
    (accessToken, refreshToken, profile, done)=>
    {
        User.findOne({google: profile.id}, (err, user)=>
        {
            if(err)
                return done(err, false);
            else if(!err && user !== null)
                return done(null, user);
            else
            {
                user = new User({ username: profile.displayName, emailID: profile.emails[0].value});
                user.google = profile.id;
                user.firstname = profile.name.givenName;
                user.lastname = profile.name.familyName;
                user.emailVerified = true;
                user.save((err, user) => {
                    if (err)
                        return done(err, false);
                    else
                        return done(null, user);
                })
            }
        });
    }
));