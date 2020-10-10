const mongoose = require('mongoose');
const Schema = mongoose.Schema;
//this schema is for the email verification token. these token expires after 43200s i.e. 12 hrs.
const Token =new Schema(
    {
        user: 
        {
            //this stores the user _id for which this token is generated
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        token:
        {
            type: String,
            required: true
        },
        createdAt:
        {
            type: Date,
            required: true,
            default: Date.now,
            expires: 43200
        }
    }
);

module.exports = mongoose.model('Token',Token);