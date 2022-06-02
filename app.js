require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require('passport');
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

mongoose.connect(process.env.MONGODB_ADDRESS);

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
  name: String,
  password: String,
  videos: [],
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

app.route("/")

  .get(function(req, res) {
    res.render("home", {user: req.user});
  });

// LOGIN AND REGISTER MANAGEMENT //////////////////////////////////////

app.route("/register")
  .get(function(req, res) {
    res.render("register", {user: req.user});
  })

  .post(function(req, res) {

    User.register({
      username: req.body.username
    }, req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("/");
        })
      }
    })

  });

app.route("/login")
  .get(function(req, res) {
    res.render("login", {user: req.user});
  })

  .post(function(req, res) {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
    req.login(user, function(err) {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("/dashboard");
        })
      }
    })
  });

app.get("/logout", function(req, res, next) {
  req.logout(function(err) {
    if (err) {
      return next(err)
    }
  });
  res.redirect("/");
});

// -----------------------------USER FUNCTIONS-------------------------

app.route("/dashboard")
  .get(function(req, res) {
    if (req.user) {
      res.render("dashboard", {
        user: req.user
      })
    } else {
      res.redirect("/login")
    }
  })

app.route("/add-video/:userId")

  .post(function(req, res) {
    if (req.user) {
      res.render("dashboard", {
        user: req.user
      })

      const userID = req.params.userId;
      const videoUrl = req.body.video;
      const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      let newVideoId = videoUrl.match(regExp);
      if (newVideoId && newVideoId[2].length == 11) {
        User.findById(userID, function(err, user) {
          if (!err) {
            user.videos.push(newVideoId[2]);
            user.save();
            res.redirect("/dashboard")
          }
        })
      } else {
        console.log("Error");
      }
    } else {
      res.redirect("/login")
    }

  });

app.get("/random-video", function(req, res) {
  if (req.user) {
    const userVideos = req.user.videos
    const video = userVideos[Math.floor(Math.random() * userVideos.length)];
    res.render("get-video", {
      videoId: video,
      user: req.user
    })
  } else {
    res.redirect("/login")
  }
});

app.post('/change-password/:userId', function(req, res){
  const password1 = req.body.password1;
  const password2 = req.body.password2;
  const userID = req.params.userId;
  if (password1 === password2){
    User.findById(userID, function(err, user) {
      if (!err) {
        user.setPassword(password1, function(err, user){
          if (!err){
            user.save();
            res.redirect("/dashboard")
          }
        })
      }
  })
}
  res.redirect("/dashboard")
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started successfully");
});
