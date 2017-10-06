const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const validator = require('validator');

const config = require('../config/db');
const {User} = require('../models/user');

var path = require('path');

router.post('/register', (req, res) => {

  
  let body = _.pick(req.body, ['email', 'password', 'username']);
  let newUser = new User({local : body});
  if (!body.email || !body.password || !body.username) {
    res.status(400).json({success: false, message: 'Please fill in all fields'});
  } else {
    if (!validator.isEmail(body.email)) {
      res.status(400).json({success: false, message: body.email +' is not a valid e-mail'});
    } else {
      User.getUserByEmail(body.email, (err, user)=>{
        if (user) {
          res.status(409).json({success: false, message: 'Such e-mail already exist'});
        } else {
          newUser.save().then(() => {
            res.status(200).json({success: true, message: 'User successfully registered'});
          }).catch((e) => {
            res.status(400).json({success: false, message: 'Failed to register', error: e.message});
          });
        }
      });
    }

  }
});

router.post('/login', (req, res) => {
  let email = req.body.email;
  let password = req.body.password;

  User.getUserByEmail(email, (err, user) => {

    if (err) {return next(err);}

    if (!user) {
      res.status(404).json({success: false, message: 'E-mail: '+ email +' does not exist'});
    } else {
      User.comparePassword(password, user.local.password, (err, isMatch) => {
        if (err) {return next(err);}
        if (isMatch) {
          User.findOneAndUpdate({"local.email": email}, { $set: { online: true }}, (err, user) => {
            if (err) {
              return res.status(500).json({success: false, message: 'Server error'});
            } else {
              const token = jwt.sign(user, config.secret, {expiresIn: 604800});
              res.json({ success: true, message : 'Successfully logged in', token : 'JWT ' + token});
            }
          });
        } else {
          res.status(400).json({success: false, message: 'Wrong password'});
        }
      });
    }
  });
});

router.get('/logout', passport.authenticate('jwt', {session: false}), (req, res) => {
  User.findOneAndUpdate({_id : req.user._id}, { $set: { online: false }}, (err, user) =>{
    if (err) {
      res.status(500).json({success: false, message: 'Server error'});
    } else {
      res.status(200).json({success: true, message: 'You are now logged out'});
    }
  });
});

router.get('/auth/facebook', passport.authenticate('facebook', {scope : ['email']}));

router.get('/auth/facebook/callback',  passport.authenticate('facebook', {session: false}), (req, res) => {
  const token = jwt.sign(req.user, config.secret, {expiresIn: 604800});
  res.header('Authorization', 'JWT ' + token).redirect('/');
});

router.get('/auth/google', passport.authenticate('google', {scope: ['profile', 'email']}));

router.get('/auth/google/callback',  passport.authenticate('google', {session: false}), (req, res) => {
  const token = jwt.sign(req.user, config.secret, {expiresIn: 604800});
  res.header('Authorization', 'JWT ' + token).redirect('/search');
});


router.get('/connect/facebook', passport.authenticate('jwt', {session: false}), passport.authorize('facebook', {scope : ['email']}));

router.get('/connect/google', passport.authenticate('jwt', {session: false}), passport.authorize('google', {scope: ['profile', 'email']}));

module.exports = router;