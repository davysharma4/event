require('dotenv').config();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('./models/user');
var jwt = require('jsonwebtoken');
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

exports.getToken = (user) =>
{
    return jwt.sign(user, process.env.SECRET_KEY, {expiresIn: 3600*24});
}

var opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.SECRET_KEY;

passport.use(new JwtStrategy(opts, (jwt_payload, done) =>
    {
        console.log("JWT payload: ", jwt_payload);
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