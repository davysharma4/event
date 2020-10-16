const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//This model stores comments which users can post on various events
//It contains two references, one which stores the user who commented and the other stores the event which was commented upon

const Comment = new Schema(
    {
        comment:
        {
            type: String,
            required: true
        },
        user:
        {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        event:
        {
            type: Schema.Types.ObjectId,
            ref: 'Event',
            required: true
        }
    }
);

module.exports = mongoose.model('Comment', Comment);