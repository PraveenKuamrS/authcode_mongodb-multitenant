"use strict";

const mongoose = require('mongoose');
const { getNextSequenceValue } = require('../../middlewares/counterModel');

const tenantSchema = new mongoose.Schema({
    tenantId: {
        type: Number,
        maxlength: 255,
        required: false,
        index: true
    },
    userName: {
        type: String,
        maxlength: 255,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        maxlength: 255,
        required: true,
        unique: true,
    },
    dbName: {
        type: String,
        maxlength: 255,
        required: true,
        unique: true,
    }
});

tenantSchema.pre('save', async function (next) {
    try {
        if (!this.tenantId) {
            this.tenantId = await getNextSequenceValue("tenantSequence");
        }
        next();
    } catch (error) {
        next(error);
    }

});

module.exports = mongoose.model('Tenant', tenantSchema, 'Tenants');
