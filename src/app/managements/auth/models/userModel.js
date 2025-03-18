const mongoose = require('mongoose');
const { getNextSequenceValue } = require('../../middlewares/counterModel');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userName: { type: String, required: true, unique: true },
    mobileNumber: { type: String },
    accessToken: { type: String },
    tokenExpiry: { type: Date },
    userId: {
        type: Number,
        maxlength: 255,
        required: false,
        index: true
    },
    role: {
        type: String,
        maxlength: 255,
        enum: ['user', 'admin', 'superAdmin', 'manager', 'author', 'reseller'],
        default: 'admin'
    },
    status: {
        type: String,
        maxlength: 255,
        enum: ['active', 'inactive', 'suspend'],
        default: 'inactive'
    },
    suspend: {
        type: Boolean,
        maxlength: 255,
        default: false
    },
    organizationId: {
        type: String,
        maxlength: 255,
        required: false,
    },

    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    },

    contact: {
        type: Number,
        maxlength: 255,
        required: false,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
    try {
        if (!this.userId) {
            this.userId = await getNextSequenceValue("userSequence");
        }
        next();
    } catch (error) {
        next(error);
    }

});
module.exports = mongoose.model('User', userSchema);