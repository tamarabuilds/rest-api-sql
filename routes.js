const express = require('express');
// new router allow us to route everything to /api without having to specify it on every sindle route
const router = express.Router();
const User = require('./models').User;
const Course = require('./models').Course;
const fs = require('fs');
const { authenticateUser } = require('./middleware/auth-user')


/**
 * Handler funciton to wrap each route with. Reduces try... catch blocks
 * @param {function} cb 
 * @returns callback
 */
function asyncHandler(cb){
    return async (req, res, next)=>{
        try {
            await cb(req, res, next)
        } catch (err) {
            next(err);
        }
    };
};



// ---------- Users Routes ------------


// GET data for currently authenticated user
    // Passing authenticateUser middleware before the route handler function
    // instructs Express to pass GET request /api/users/ to first go to our 
    // custom route handler function then to the inline route handler function
router.get('/users', authenticateUser, asyncHandler(async (req, res) => {
    const user = req.currentUser

    const allowed = ['id', 'firstName', 'lastName', 'emailAddress'];

    // Filter object properties by key learned from: https://stackoverflow.com/questions/38750705/filter-object-properties-by-key-in-es6 
    const filtered = Object.keys(user.dataValues)
        .filter(key => allowed.includes(key))
        .reduce((obj, key) => {
            obj[key] = user.dataValues[key];
            return obj;
        }, {});

    res.status(200).json(filtered);
}));
    
    
// POST to CREATE a new user
router.post('/users', asyncHandler(async (req, res) => {
    try {
        await User.create(req.body);
        // Set the status to 201 Created and end the response
        // Set the location header to "/"
        res.status(201).setHeader('Location', '/').end()            /// WHAT DOES THIS MEAN??
    } catch (error) {
        console.log('Error: ', error);

        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = error.errors.map(err => err.message);
            res.status(400).json({errors});
        } else {
            throw error;
        }
    }
    
}));



// ---------- Courses Routes ------------

// GET list of all courses
router.get('/courses', asyncHandler(async (req, res) => {
    const courses = await Course.findAll();

    res.status(200).json(courses);
}));

// GET individual course
router.get('/courses/:id', asyncHandler(async (req, res) => {
    const courseId = req.params.id
    const courses = await Course.findAll();
    const course = courses.find(item => item.id == courseId)
    if (course) {
        res.status(200).json(course)
    } else {
        res.status(404).json({ message: 'Course not found'});
    };    
}));

// POST to CREATE a new course
router.post('/courses', authenticateUser, asyncHandler(async (req, res) => {
    try {
        await Course.create(req.body);
        // Set the status to 201 Created and end the response
        // Set the location header to "/"
        res.status(201).setHeader('Location', '/').end()
    } catch (error) {
        console.log('Error: ', error);

        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = error.errors.map(err => err.message);
            res.status(400).json({errors});
        } else {
            throw error;
        }
    }    
}));

// PUT to UPDATE an individual course
router.put('/courses/:id', authenticateUser, asyncHandler(async (req, res) => {
    try {
        let course = await Course.findByPk(req.params.id)
        if (course) {
            // Storing data of the authenticated user coming from authenticateUser middleware
            const user = req.currentUser; 
            // Confirming authenticated user is the owner of the course
            const courseOwner = course.dataValues.userId;
            const authenticatedUserId = user.dataValues.id;
            
            if (courseOwner === authenticatedUserId){
                // update the course object from the request body
                await course.update(req.body);
    
                // For a put request, it's convention to send status 204 (meaning no content == everything went OK but there's nothing to send back)
                // Must end the request with .end
                res.status(204).end();
    
            } else {
                res.status(403).json({message: "User is not owner of the course"});
            }

        } else {
            res.status(400).json({message: "Course not found"});
        }        
    } catch (error) {
        console.log('Error: ', error);

        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = error.errors.map(err => err.message);
            res.status(400).json({errors});
        } else {
            throw error;
        }
    }
}));


// DELETE an individual course
router.delete('/courses/:id', authenticateUser, asyncHandler(async (req, res) => {
    try {
        let course = await Course.findByPk(req.params.id)
        if (course) {
            // Storing data of the authenticated user coming from authenticateUser middleware
            const user = req.currentUser; 
            // Confirming authenticated user is the owner of the course
            const courseOwner = course.dataValues.userId;
            const authenticatedUserId = user.dataValues.id;
            
            if (courseOwner === authenticatedUserId){
                // delete the course object
                await course.destroy();
                // For a delete request, it's convention to send status 204 (meaning no content == everything went OK but there's nothing to send back)
                // Must end the request with .end
                res.status(204).end();
                    
            } else {
                res.status(403).json({message: "User is not owner of the course"});
            }

        } else {
            res.status(400).json({message: "Course not found"});
        }
    } catch (error) {
        console.log('Error: ', error);
    }
}));



module.exports = router;