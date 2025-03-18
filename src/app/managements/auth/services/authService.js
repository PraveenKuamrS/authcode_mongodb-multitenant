// auth Service
"use strict";

const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const moment = require('moment-timezone');
const uuid = require('uuid');
const nodemailer = require('nodemailer');

const User = require('../models/userModel');
const Tenant = require('../models/tenantModel');
const SuperAdmin = require('../models/superAdminModel')
const RoleCheck = require('../../middlewares/rolecheck');


const loginAttempts = {};

class AuthService {
    async registerWithEmail(req, res) {
        check('userName').notEmpty().withMessage('Username is required');
        check('email').isEmail().withMessage('Invalid email format');
        check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long');

        const errors = validationResult(req.body);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Invalid input data', details: errors.array() });
        }
        const { userName, email, password, contact, role } = req.body;
        try {
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
                return res.status(201).json({ message: 'Email already exists!' });
            }
            const organizationId = uuid.v4();

            const dbName = userName + '_' + uuid.v4();
            // await PricePlanService.createDefaultPricingPlans();
            // If req.role exists, create a super admin with reset password email
            if (req.body.role) {
                await this.createTenantAndUser(userName, email, password, contact, role, dbName, organizationId, req);
                await this.createTenantDatabaseAndCollections(dbName);
                await this.createOrganizationFolders(userName);
                // this.sendRegistrationSuccessEmailToUser(email);
                await this.login({ email, password: password }, req);
                res.status(200).json('Please check your mail and reset your password!');
            } else {
                await this.createTenantAndUser(userName, email, password, contact, role, dbName, organizationId, req);
                await this.createTenantDatabaseAndCollections(dbName);
                await this.createOrganizationFolders(userName);
                // this.sendRegistrationSuccessEmail(email);
                const tokenAndUserData = await this.login({ email, password: password }, req);

                res.status(200).json(tokenAndUserData);
            }
        } catch (error) {
            console.error('Error Registration:', error);
            res.status(500).json({ message: 'Error in Registration.' });
        }
    }

    async createTenantAndUser(userName, email, password, contact, role, dbName, organizationId, req) {
        try {
            const tenant = new Tenant({ userName, email, dbName });
            await tenant.save();

            console.log('userName, email, password, contact, role, organizationId, tenantId: tenant._id ', userName, email, password, contact, role, organizationId, tenant._id);


            const user = new User({ userName, email, password, contact, role, organizationId, tenantId: tenant._id });
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);

            await user.save();

        } catch (error) {
            console.error('Error creating tenant and user:', error);
            throw new Error('Error creating tenant and user.');
        }
    }

    async createTenantDatabaseAndCollections(dbName) {
        const tenantConnection = mongoose.createConnection(`mongodb://127.0.0.1/${dbName}`);

        try {
            // Access the tenant database
            const tenantDb = tenantConnection.useDb(dbName);

            // Create a collection and insert a document to force database creation
            const testCollection = tenantDb.collection('testCollection');
            await testCollection.insertOne({ message: 'Initial document to create database' });

            // console.log(`Database "${dbName}" and collections created successfully.`);
        } catch (error) {
            console.error('Error during tenant database and collections creation:', error);
        } finally {
            tenantConnection.close();
        }
    }
    async createOrganizationFolders(userName) {
        const organizationFolders = [
            path.join(__dirname, `../../../../../${userName}/organization_masterimages`),
            path.join(__dirname, `../../../../../${userName}/organization_mastervideos`)
        ];
        organizationFolders.map(async (folder) => {
            await fs.mkdir(folder, { recursive: true });
        });
    }

    async login({ email, password }, fullreq) {
        check('email').isEmail().withMessage('Invalid email format');
        check('password').notEmpty().withMessage('Password is required');

        let user = await SuperAdmin.findOne({ email }) || await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid email');
        }

        if (user.suspend) {
            return {
                status: 207,
                message: 'Your account has been suspended. Please contact the administrator'
            };
        }

        if (!this.canLogin(email)) {
            throw new Error('Too many login attempts. Try again in 5 minutes.');
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            this.recordFailedLogin(email);
            throw new Error('Invalid password');
        }

        // this.logLoginActivity(email, user.userName, user.role, fullreq);

        let token = '';

        let tenant;

        if (user.role !== 'superAdmin') {
            tenant = await Tenant.findById(user.tenantId);

            if (!tenant) {
                throw new Error('Tenant not found');
            }
        }

        if (user.role === "superAdmin") {
            token = await this.sendTokenResponse(email, user.role, user.superUserId, null);

            return {
                userData: {
                    username: user.userName,
                    email: user.email,
                    role: user.role,
                    userId: user.superUserId,
                    // avatar: user.avatar,
                    abilities: RoleCheck.roles[user.role].actions.map(action => ({
                        action,
                        subject: "all",
                        _id: user._id
                    })),
                    _id: user._id,
                    tenantId: user.tenantId || null,
                    tenantDb: user.role === 'superAdmin' ? null : tenant.dbName
                },
                accessToken: token,
                avatar: user.avatar,
                userAbilities: RoleCheck.roles[user.role].actions.map(action => ({
                    action,
                    subject: "all",
                    _id: user._id
                }))
            };
        } else {
            token = await this.sendTokenResponse(email, user.role, user.userId, user.tenantId);
            return {
                userData: {
                    username: user.userName,
                    email: user.email,
                    role: user.role,
                    userId: user.userId,
                    // avatar: user.avatar,
                    abilities: RoleCheck.roles[user.role].actions.map(action => ({
                        action,
                        subject: "all",
                        _id: user._id
                    })),
                    _id: user._id,
                    tenantId: user.tenantId || null,
                    tenantDb: user.role === 'superAdmin' ? null : tenant.dbName
                },
                accessToken: token,
                userAbilities: RoleCheck.roles[user.role].actions.map(action => ({
                    action,
                    subject: "all",
                    _id: user._id
                }))
            };
        }

    }

    async sendTokenResponse(email, role, tenantId) {
        return new Promise(async (resolve, reject) => {
            const payload = { user: { email, role, tenantId } };
            const expiresIn = '180d';
            jwt.sign(payload, process.env.JWT_SECRET || 'mysecrettoken', { expiresIn }, async (err, token) => {
                if (err) {
                    console.error('Error signing the token:', err);
                    reject('Error generating the token');
                } else {
                    if (role === 'superAdmin') {
                        // res.json({message: 'User Is Super Admim'})
                    } else {
                        await this.updateUserAccessToken(email, token);
                    }
                    resolve(`Bearer ${token}`);
                }
            });
        });
    }

    async updateUserAccessToken(email, accessToken) {
        try {
            const user = await User.findOneAndUpdate(
                { email: email },
                { accessToken, status: 'active' },
                { new: true }
            );
            if (!user) {
                const subUser = await subUserSchema.findOneAndUpdate(
                    { email: email },
                    { accessToken, status: 'active' },
                    { new: true }
                );
                if (!subUser) {
                    await resellerSchema.findOneAndUpdate(
                        { email: email },
                        { accessToken, status: 'active' },
                        { new: true }
                    );
                }
            }
        } catch (error) {
            console.error('Error updating user accessToken:', error);
            throw new Error('Error updating user accessToken');
        }
    }


    async canLogin(email) {
        const currentTime = Date.now();
        if (loginAttempts[email]) {
            if (loginAttempts[email].count >= 3) {
                if (currentTime - loginAttempts[email].timestamp < 1 * 60 * 1000) {
                    return false;
                } else {
                    delete loginAttempts[email];
                }
            }
        }
        return true;
    }

    async recordFailedLogin(email) {
        const currentTime = Date.now();
        if (!loginAttempts[email]) {
            loginAttempts[email] = { count: 1, timestamp: currentTime };
        } else {
            loginAttempts[email].count += 1;
            loginAttempts[email].timestamp = currentTime;
        }
    }

    static async ensureSuperAdminExists() {
        try {
            const superAdmin = await SuperAdmin.findOne({ role: 'superAdmin' });
            if (!superAdmin) {
                const adminData = {
                    userName: 'SuperAdmin',
                    email: 'superadmin@gmail.com',
                    password: 'superAdmin123',
                    contactNumber: 9618280456,
                    role: 'superAdmin',
                    status: 'active',
                    superUserId: 999
                };
                const newSuperAdmin = new SuperAdmin(adminData);
                await newSuperAdmin.save();
                console.log('Super Admin created');
            }
        } catch (error) {
            console.error('Error ensuring super admin exists:', error);
        }
    }


}

AuthService.ensureSuperAdminExists();

module.exports = new AuthService();
