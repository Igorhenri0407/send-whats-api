const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const connection = require('../database/database');



module.exports = {
  registerUser: async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // Check if the email is already registered
      const existingUser = await userModel.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Este email já está Cadastrado', field: 'email' });
      }

      // Create the new user
      await userModel.createUser(name, email, password);

      res.status(201).json({ message: 'Usúario cadastrado com sucesso' });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  },

  loginUser: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Retrieve the user from the database based on the email
      const user = await userModel.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Compare the provided password with the stored hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Generate a JWT token
      const token = jwt.sign({ id: user.id }, 'your_secret_key');

      // Update the user's token in the database
      const query = 'UPDATE users SET token = ? WHERE id = ?';
      connection.query(query, [token, user.id], (updateError, updateResults) => {
        if (updateError) {
          console.error('Error updating user token:', updateError);
          return res.status(500).json({ error: 'Failed to update user token' });
        }

        // Send the token and user information in the response
        res.status(200).json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
          },
        });
      });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ error: 'Failed to log in' });
    }
  },
};
