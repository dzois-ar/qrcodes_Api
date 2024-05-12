// Import required modules
const express = require('express');
const app = express();
const port = 3000;

const cors = require('cors');  // Enable CORS
const bcrypt = require('bcrypt');  // For password hashing
const startingServer = new Date().toLocaleString();  // Get server start time
const pool = require('./config/database.js');   // Import database configuration
var sessions = require('express-session');  // For session management
var path = require('path');  // For handling file paths

const fs = require('fs'); // Import the 'fs' module
const { v4: uuidv4 } = require('uuid'); // Import the UUID library

const qrcode = require('qrcode');   // Import qrcode library for generating QR codes
pool.connect();  // Connect to the database


// Define session options
const oneDay = 24 * 3600 * 1000;
var FileStore = require('session-file-store')(sessions);
var fileStoreOptions = { path: 'sessions/', ttl: 300 * 24 * 3600 };

// Configure session middleware
app.use(sessions({
  secret: 'opQVesdMpNWjrrIQCc6rdxs01lwHzFr8',
  saveUninitialized: false,
  cookie: { maxAge: 300 * oneDay, httpOnly: true, secure: 'auto', sameSite: true, },
  resave: true,
  store: new FileStore(fileStoreOptions)
}))

// Configure middleware for parsing JSON and URL-encoded bodies
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true, parameterLimit: 1000000 }));
app.use(express.raw());

// Enable CORS
app.use(cors());

// Serve static files
app.use('/pages', express.static('pages'));
app.use('/static', express.static('static'));
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


// Define custom validation functions
function validateFullName(fullName) {
  return typeof fullName === 'string' && fullName.trim() !== '';
}

function validateUserName(userName) {
  return typeof userName === 'string' && /^[a-zA-Z0-9]+$/.test(userName);
}

function validateEmail(email) {
  // Basic email pattern matching, you can enhance it as needed
  return typeof email === 'string' && /\S+@\S+\.\S+/.test(email);
}

function validateMobile(mobile) {
  // Basic mobile number pattern matching, you can enhance it as needed
  return typeof mobile === 'string' && /^\d{10}$/.test(mobile);
}

function validateActive(active) {
  return typeof active === 'boolean';
}

function validateUserId(userId) {
  // Assuming variable should be a positive integer
  return Number.isInteger(userId) && userId > 0;
}

function validateLocalPath(path) {
  // Assuming path  should be a non-empty string representing a valid file path
  if (typeof path !== 'string' || path.trim() === '') {
    return false;
  }

  // Check if the file exists at the specified path
  try {
    fs.accessSync(path, fs.constants.F_OK);
    return true; // File exists
  } catch (err) {
    return false; // File does not exist or other error occurred
  }
}

// Function to generate session
function generateSession(userID, FullName, usermanager, req, res, link) {
  req.session.regenerate(function (err) {
    if (err) {
      console.error("Session error:" + err)
    }
    else {
      req.session.UserID = userID
      req.session.FullName = FullName
      req.session.um = usermanager
      res.redirect(link)
    }
  })
}

// Middleware for verifying session
const verify = (req, res, next) => {
  // Check if UserID exists in session data
  if (req.session.UserID) {
    // If UserID exists, proceed to the next middleware or route handler
    next()
  } else {
    // If UserID does not exist, destroy the session, redirect to login page, and return -1
    req.session.destroy()
    res.sendFile(path.join(__dirname + '/pages/login.html'))
    return -1;
  }
}

// Middleware for verifying user's manager
const verifyUsersManager = (req, res, next) => {
  if (req.session.um && req.session.um == 'Y') {
    next()
  }
  else {
    res.sendFile(path.join(__dirname + '/pages/MainPage.html'))
    return -1;
  }
}

// Endpoint to get user session info
app.get('/UserSessionInfo', verify, async function (req, res) {
  var sess = req.session
  res.send(sess)
})

// Endpoint for user login
app.post('/login', (req, res) => {
  // Construct parameters array for SQL query
  const parameters = [req.body.email];
  // Define SQL query to retrieve user data based on email
  const sql = `SELECT * FROM "@ZTKA_TEST_LOGIN_USERS" WHERE "Email" = $1;`;
  // Execute SQL query
  pool.query(sql, parameters, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    const rows = result.rows;
    if (rows.length > 0) {
      // If user with the provided email is found in the database
      bcrypt.compare(req.body.password, rows[0].password, function (err, result) {
        if (result === true) {
          // If password is correct, generate session data and redirect to main page
          const userID = rows[0].Code;
          const FullName = rows[0].FullName;
          const usermanager = rows[0].UsersManager;
          generateSession(userID, FullName, usermanager, req, res, '/mainPage');
        } else {
          // If password is incorrect, redirect to login page with invalid parameter
          res.redirect('/?invalid=1');
        }
      });
    } else {
      // If user with the provided email is not found in the database, redirect to login page with invalid parameter
      res.redirect('/?invalid=1');
    }
  });
});


// Endpoint for user logout
app.get('/logout', verify, function (req, res) {
  req.session.destroy()
  res.sendFile(path.join(__dirname + '/pages/login.html'))
})

// Endpoint for main page
app.get('/mainPage', verify, (req, res) => {
  res.sendFile(path.join(__dirname + '/pages/MainPage.html'));
});

// Endpoint for serving login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/pages/login.html'));
});

// Endpoint for user registration
app.post('/register', verify, (req, res) => {
  // Validate request body
  const { FullName, UserName, Email, Mobile, Active, Password } = req.body;
  if (
    !validateFullName(FullName) ||  // Validate FullName
    !validateUserName(UserName) ||  // Validate UserName
    !validateEmail(Email) ||        // Validate Email
    !validateMobile(Mobile) ||      // Validate Mobile
    !validateActive(Active)         // Validate Active
  ) {
    // If any validation fails, return a 400 error with a message indicating invalid input data
    return res.status(400).json({ error: 'Invalid input data' });
  }

  // Generate a salt for password hashing
  bcrypt.genSalt(10, function (err, salt) {
    // Hash the password using the generated salt
    bcrypt.hash(Password, salt, function (err, hash) {
      // Construct parameters array for SQL query
      const parameters = [FullName, UserName, Email, Mobile, Active, hash];
      // Define SQL query to insert new user into the database
      const sql = `INSERT INTO "@ZTKA_TEST_LOGIN_USERS" ("FullName", "UserName" , "Email", "Mobile","active","password" ) values ($1, $2, $3, $4, $5, $6)`;
      // Execute SQL query
      pool.query(sql, parameters, (err, result) => {
        if (err) {
          // If an error occurs during SQL query execution, log the error and send an error response
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }
        // Send response indicating successful registration
        res.json({ message: 'Registration successful' });
      });
    });
  });
});

// Endpoint for user management page
app.get('/UsersManagment', verify, verifyUsersManager, (req, res) => {
  res.sendFile(path.join(__dirname + '/pages/UsersManagment.html'));
});

// Endpoint to get list of users
app.get('/getUsers', verify, (req, res) => {
  const sql = `SELECT "Code", "FullName", "UserName", "password", "Email", "active", "Mobile" FROM "@ZTKA_TEST_LOGIN_USERS";`;
  pool.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    const rows = result.rows;
    res.json(rows);
  });
});


// Endpoint to delete a user
app.get('/deleteUser', verify, (req, res) => {
  const parameters = [req.query.Code];
  const sql = `DELETE FROM "@ZTKA_TEST_LOGIN_USERS" WHERE "Code" = $1;`;
  pool.query(sql, parameters, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'User deleted successfully' });
  });
});


/// Endpoint to update user information
app.post('/updateUser', verify, (req, res) => {
  // Validate request body
  const { FullName, UserName, Email, Mobile, Active, Code } = req.body;
  if (
    !validateFullName(FullName) ||
    !validateUserName(UserName) ||
    !validateEmail(Email) ||
    !validateMobile(Mobile) ||
    !validateActive(Active)
  ) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  // Generate a salt for password hashing
  bcrypt.genSalt(10, function (err, salt) {
    // Hash the password using the generated salt
    bcrypt.hash(req.body.password, salt, function (err, hash) {
      // Construct parameters array for SQL query
      const parameters = [FullName, UserName, Email, Mobile, Active, hash, Code];
      // Define SQL query to update user data
      const sql = `UPDATE "@ZTKA_TEST_LOGIN_USERS" SET "FullName" = $1, "UserName" = $2, "Email" = $3, "Mobile" = $4, "active" = $5, "password" = $6 WHERE "Code" = $7`;
      // Execute SQL query
      pool.query(sql, parameters, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'User updated successfully' });
      });
    });
  });
});



// const qrcodeRoutes = require('./routes/qrcodeRouters');
// app.use('/qrcode', qrcodeRoutes);

// Endpoint to generate QR code from a provided URL or default text and return it as an image
app.get("/qrcode", async (req, res) => {
  try {
    const url = req.body.url || 'https://examle.com ';

    // Generate QR code data URL
    const newQr = await qrcode.toDataURL(url);

    // Generate a random UUID for the filename and construct the file path
    const randomId = uuidv4();
    const filePath = `qrcodes/${randomId}.png`;

    // Write the QR code image to the file system
    fs.writeFileSync(filePath, newQr.replace(/^data:image\/png;base64,/, ''), 'base64');
    // Send the QR code image as a response
    res.send(`<img scr=${filePath} alt='Qr code' id='qrcode' name=${filePath}></img>`);

  } catch (error) {
    // If an error occurs, send a 500 Internal Server Error response
    res.status(500);
    res.json({
      remark: "Internal server error"
    })

  }
})

// Route handler for handling POST requests to '/addQrcode'
app.post('/addQrcode', verify, (req, res) => {
  // Validate request body
  const { UserId, qrcode } = req.body;
  if (
    !validateUserId(UserId) ||
    !validateLocalPath(qrcode)
  ) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  const parameters = [req.body.UserId, req.body.qrcode];

  // Define SQL query to insert data into the database
  const sql = `INSERT INTO "@ZTKA_TEST_QRCODE" ("OwnerID", "Plate", "Color") VALUES ($1, $2)`;
  // Execute SQL query
  pool.query(sql, parameters, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Qrcode added successfully' });
  });
});


// Route handler for handling GET requests to '/getAllQrcode'
app.get('/getAllQrcode', verify, (req, res) => {
  // Define SQL query to retrieve all QR codes with associated user information
  const sql = `SELECT ztc."Code", ztu."FullName", ztc."QrCode", ztc."CreatedDateTime", ztc."UserId"  
               FROM "@ZTKA_TEST_QRCODE" ztc
               JOIN "@ZTKA_TEST_LOGIN_USERS" ztu ON ztu."Code" = ztc."UserId"`;

  // Execute SQL query
  pool.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    const rows = result.rows;
    res.json(rows);
  });
});


// Route handler for handling GET requests to '/get_UserQrcode'
app.get('/getUserQrcode', verify, (req, res) => {
  // Extract the userID parameter from the request query
  const parameters = [req.query.userID];

  // Define SQL query to retrieve user's QR codes based on userID
  const sql = `SELECT * "@ZTKA_TEST_CARS" ztc 
               WHERE "OwnerID" = $1`;

  // Execute SQL query
  pool.query(sql, parameters, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    const rows = result.rows;
    res.json(rows);
  });
});


// Route handler for handling POST requests to '/updateQrcode'
app.post('/updateQrcode', verify, (req, res) => {
  // Validate request body
  const { userId, qrcode, code } = req.body;

  // Validate users who created this qrcode
  if (req.query.userID !== userId) {
    // If req.query.userID is not the same as userId, return an error message
    return res.status(403).json({ error: 'You are not authorized to perform this action' });
  }

  if (
    !validateUserId(userId) ||
    !validateLocalPath(qrcode) ||
    !validateUserId(code)
  ) {
    // If any validation fails, return a 400 error with a message indicating invalid input data
    return res.status(400).json({ error: 'Invalid input data' });
  }


  // Construct parameters array for SQL query
  const parameters = [req.body.Event_ID, req.body.Event_Comments, req.body.Code];

  // Define SQL query to update qrcode based on Code
  const sql = `UPDATE "@ZTKA_TEST_CAR_HISTORY" SET "Event_ID" = $1, "Event_Comments" = $2 WHERE "Code" = $3`;

  // Execute SQL query
  pool.query(sql, parameters, (err, result) => {
    if (err) {
      // If an error occurs during SQL query execution, log the error
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    // Send response indicating successful update
    res.json({ message: 'Qrcode updated successfully' });
  });
});

// Route handler for handling GET requests to '/deleteQrcode'
app.get('/deleteQrcode', verify, (req, res) => {
  // Extract the Code parameter from the request query
  const { code, userId } = req.body;

  // Validate users who created this qrcode
  if (req.query.userID !== userId) {
    // If req.query.userID is not the same as userId, return an error message
    return res.status(403).json({ error: 'You are not authorized to perform this action' });
  }

  // Define SQL query to delete a QR code based on its unique Code
  const sql = `DELETE FROM "@ZTKA_TEST_CARS" WHERE "Code" = $1`;

  // Execute SQL query
  pool.query(sql, parameters, (err, result) => {
    if (err) {
      // If an error occurs during SQL query execution, log the error
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    // Send response indicating successful deletion
    res.json({ message: 'Qrcode deleted successfully' });
  });
});


// Start server
app.listen(port, () => {
  console.log(`Server Starts at ${startingServer} and listening at http://localhost:${port}`);
});


