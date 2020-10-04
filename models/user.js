const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
require('mongoose-type-email');
const Email = mongoose.SchemaTypes.Email;

var User = new Schema(
    {
        firstname:
        {
            type: String,
            default: ''
        },
        lastname:
        {
            type: String,
            default: ''
        },
        email:
        {
            type: Email,
            required: true
        },
        facebookId:
        {
            type: String
        },
        admin:
        {
            type: Boolean,
            default: false
        },
        campusAmbassador:
        {
            type: Boolean,
            default: false
        }
    }
);

User.plugin(passportLocalMongoose);

module.exports = mongoose.model('User',User);