"use strict";

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const superAdminSchema = new mongoose.Schema({
    userName: {
        type: String,
        maxlength: 255,
        required: true,
        trim: true,
        unique: true,
    },
    email: {
        type: String,
        maxlength: 255,
        required: true,
        trim: true,
        unique: true,
    },
    password: {
        type: String,
        maxlength: 255,
        required: true,
    },
    contactNumber: {
        type: String,
        maxlength: 255,
        required: false,
        trim: true,
    },
    role: {
        type: String,
        maxlength: 255,
        required: false,
        default: 'superAdmin',
    },
    status: {
        type: String,
        maxlength: 255,
        required: false,
        default: 'active',
    },
    superUserId: {
        type: Number,
        maxlength: 255,
        required: false,
        default: 999
    },
}, {
    timestamps: true,
});

superAdminSchema.pre('save', async function (next) {
    try {
        if (this.isModified('password')) {
            this.password = await bcrypt.hash(this.password, 10);
        }
        next();
    } catch (error) {
        next(error);
    }

});

module.exports = mongoose.model('SuperAdmin', superAdminSchema, 'SuperAdmin');
