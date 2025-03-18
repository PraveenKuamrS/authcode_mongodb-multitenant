"use strict";

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("../config/db");

//ROUTES
const authRoutes = require('../app/managements/auth/routes/authRoutes');


// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

const corsOptions = {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["*"],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());


app.use(authRoutes)

// Database connection
connectDB().catch(err => {
    console.error(err.stack);
    process.exit(1);
});



//  start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});