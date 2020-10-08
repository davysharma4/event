const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Request = new Schema(
    {
        user:
        {
            type:  Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Request',Request);