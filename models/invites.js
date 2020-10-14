const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//This schema is for the invites that campus ambassadors send to people via email
//We store the email to which the invite has been sent and the campus ambassador who sent the invite
//We also store whether the person has clicked the invite link or not
const Invite = new Schema(
    {
        user:
        {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        email:
        {
            type: String
        },
        accepted:
        {
            type: Boolean,
            default: false
        }
    }
);

module.exports = mongoose.model('Invite', Invite);