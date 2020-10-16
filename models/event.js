const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//This schema is for the events which will be posted by the admins
const Event = new Schema(
    {
        name:
        {
            type: String,
            required: true
        },
        description:
        {
            type: String,
            required: true
        },
        img:
        {
            type: String
        }
    }
);
module.exports = mongoose.model('Event', Event);