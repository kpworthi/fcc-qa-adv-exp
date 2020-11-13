
const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function (app, myDataBase) {

  //Ensure Authenticated middleware
  function ensureAuthenticated(req, res, next) {
    console.log("Verifying authentication");
    if (req.isAuthenticated()) {
      console.log("Verification success.")
      return next();
    }
    console.log("Verification failed.")
    res.redirect('/');
  };

  app.route("/")
    .get((req, res) => {
      res.render(process.cwd() + '/views/pug/index',  
            {title: 'Connected to Database', 
             message: 'Please login',
             showLogin: true,
             showRegistration: true,
             showSocialAuth: true});
    });

  app.route('/login') 
    .post((req, res, next) => {
      console.log("Log-in request."); 
      next();
      },
      passport.authenticate('local', { failureRedirect: '/abc' }),
      function(req, res) {
        console.log("log-in successful, redirecting")
        res.redirect('/profile');
      });

  app.route('/auth/github')
    .get(passport.authenticate('github'));

  app.route('/auth/github/callback')
    .get(passport.authenticate('github', { failureRedirect: '/abc' }),
      function(req, res) {
        req.session.user_id = req.user.id;
        res.redirect('/chat');
      });

  app.route('/profile')
    .get(ensureAuthenticated, function(req, res, next){
      res.render(process.cwd() + '/views/pug/profile', 
                {username: req.user.username || req.user.name});
      });

  app.route('/logout')
    .get((req, res) => {
      req.logout();
      res.redirect('/');
    });

  //User registration
  app.route('/register')
    .post((req, res, next) => {

      const hash = bcrypt.hashSync(req.body.password, 12)

      myDataBase.findOne({ username: req.body.username }, function(err, user) {
        if (err) {
          next(err);
        } else if (user) {
          res.redirect('/');
        } else {
          myDataBase.insertOne({
            username: req.body.username,
            password: hash
          },
            (err, doc) => {
              if (err) {
                res.redirect('/');
              } else {
                // The inserted document is held within
                // the ops property of the doc
                next(null, doc.ops[0]);
              }
            }
          )
        }
      })
  },passport.authenticate('local', { failureRedirect: '/' }),
    (req, res, next) => {
      res.redirect('/profile');
    }
  );

  //Chat handler
  app.route('/chat')
    .get(ensureAuthenticated, 
         function(req, res, next){
           res.render(process.cwd() + '/views/pug/chat', {
             user: req.user
           })
         });

  //404 handler
  app.use((req, res, next) => {
    res.status(404)
      .render(process.cwd() + '/views/pug/fourohfour', {})
  });
}
