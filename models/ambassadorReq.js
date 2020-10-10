const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Request = new Schema(
    {
        user:
        {
            //we store the user _id in the requests to know the which user has requested
            type:  Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Request',Request);