
require('dotenv').config();
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const ObjectID = require('mongodb').ObjectID;
const GitHubStrategy = require('passport-github').Strategy;

module.exports = function (app, myDataBase) {

  //Passport user init
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    myDataBase.findOne({"_id": new ObjectID(id)}, (err, doc) => {
      if (err) return err;
      done(null, doc);
    });
  });

  //Passport strategy setup
  passport.use(new LocalStrategy(
    function(username, password, done) {
      console.log("checking...");
      myDataBase.findOne({ username: username }, function (err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        if (!bcrypt.compareSync(password, user.password)) { return done(null, false); }
        return done(null, user);
      });
    }
  ));

  passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "https://fcc-qa-adv-exp.kpworthi.repl.co/auth/github/callback"
    },
    function(accessToken, refreshToken, profile, cb) {
      myDataBase.findOneAndUpdate(
        {id: profile.id},
        {$setOnInsert:{
          id: profile.id,
          photo: profile.photos[0].value || '',
          email: Array.isArray(profile.emails) ? profile.emails[0].value : 'No public email',
          created_on: new Date(),
          provider: profile.provider || ''
        },$set:{
          name: profile.displayName || 'John Doe',
          last_login: new Date()
        },$inc:{
          login_count: 1
        }},
        {upsert:true, new: true},
        (err, doc) => {
          return cb(null, doc.value);
        }
      )
    }
  ));


}