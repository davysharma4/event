const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//This schema generates a token with a 1 hr timewindow to reset the password
var ResetToken = new Schema(
    {
        user:
        {
            type:  Schema.Types.ObjectId,
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
            expires: 3600
        }
    }
);

module.exports = mongoose.model('ResetToken', ResetToken);