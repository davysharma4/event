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
        emailID:
        {
            type: Email,
            required: true,
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
        },
        emailVerified:
        {
            type: Boolean,
            default: false
        },
        college:
        {
            type: String,
            default: 'MNNIT'
        }

    }
);

User.plugin(passportLocalMongoose);

module.exports = mongoose.model('User',User);