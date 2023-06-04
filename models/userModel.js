const connection = require('../database/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


module.exports = {
  createUser: (name, email, password) => {
    return new Promise((resolve, reject) => {
      // Hash the password
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          reject(err);
        } else {
          // Insert the new user into the database
          const createdAt = new Date();
          const query = 'INSERT INTO users (name, email, password, createdAt) VALUES (?, ?, ?, ?)';
          connection.query(query, [name, email, hashedPassword,createdAt], (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          });
        }
      });
    });
  },
  
  getUserByEmail: (email) => {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE email = ?';
      connection.query(query, [email], (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results[0]);
        }
      });
    });
  },
  findOneAndUpdate: (token, sessionName) => {
    return new Promise((resolve, reject) => {
        // Generate a JWT token
        const token_session = jwt.sign({ token_session: sessionName }, 'your_secret_key');
        //const modified_token_session = `token_session_${token_session}`;

        const query = 'UPDATE users SET token_session = ? WHERE token = ?';
        connection.query(query, [token_session, token], (error, results) => {
            if (error) {
                reject(error);
            } else {
                const resultWithToken = {
                    token_session: token_session,
                    result: results
                };
                resolve(resultWithToken);
            }
        });
    });
  },

  getUserQtd_Msg: (token_session) => {
    return new Promise((resolve, reject) => {
      const query = 'SELECT qtd_msg FROM users WHERE token_session = ?';
      connection.query(query, [token_session], (error, results) => {
        if (error) {
          reject(error);
        } else {
          //console.log(results);
          resolve(results[0]);
        }
      });
    });
  },
  decreaseUserQtd_Msg: (token_session) => {
    return new Promise((resolve, reject) => {
      const queryUpdate = 'UPDATE users SET qtd_msg = qtd_msg - 1 WHERE token_session = ?';
      connection.query(queryUpdate, [token_session], (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
  },
};
