require('dotenv').config();
const express = require("express");
const flash = require('express-flash');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require('passport');
const passportLocalMongoose = require("passport-local-mongoose");
const fetch = require("node-fetch");

const apiKey = process.env.GOOGLE_YT_API_KEY;
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

app.use(flash());

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
    res.render("home", {
      user: req.user
    });
  });

// LOGIN AND REGISTER MANAGEMENT //////////////////////////////////////

app.route("/register")
  .get(function(req, res) {
    res.render("register", {
      user: req.user
    });
  })

  .post(function(req, res) {

    User.register({
      username: req.body.username
    }, req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        req.flash("info", "User already registered")
        res.redirect("/login");
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("/");
        })
      }
    })

  });

app.route("/login")
  .get(function(req, res) {
    res.render("login", {
      user: req.user
    });
  })

  .post(function(req, res) {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
    req.login(user, function(err) {
      if (err) {
        req.flash("info", "Incorrect password")
        res.redirect("/login")
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

app.route("/add-video")

  .get(function(req, res) {
    res.redirect("/dashboard")
  })

  .post(function(req, res) {
    if (req.user) {
      const userID = req.user._id;
      const videoUrl = req.body.video;
      const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      let newVideoId = videoUrl.match(regExp);
      if (newVideoId && newVideoId[2].length == 11) {
        if (req.user.videos.includes(newVideoId[2])) {
          req.flash("info", "Video already in collection");
          res.redirect("/dashboard")
        } else {
          User.findById(userID, function(err, user) {
            if (!err) {
              user.videos.push(newVideoId[2]);
              user.save();
              req.flash("info", "Video added to collection");
              res.redirect("/dashboard")
            }
          })
        }
      } else {
        req.flash("info", "Something went wrong");
        res.redirect("/dashboard")
      }
    } else {
      res.redirect("/login")
    }

  });

  app.route("/add-playlist")

    .get(function(req, res) {
      res.redirect("/dashboard")
    })

    .post(function(req, res){
      if (!req.user){
        res.redirect("/login")
      } else {
        const userID = req.user._id;
        const playlistUrl = req.body.playlist;
        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|playlist\?list=|\&list=)([^#\&\?]*).*/;
        let newPlaylistId = playlistUrl.match(regExp);
        fetch("https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId="+newPlaylistId[2]+"&key="+apiKey)
          .then(response => response.json())
          .then(data => {
            data.items.map((item) => {
              if (!req.user.videos.includes(item.contentDetails.videoId)) {
                req.user.videos.push(item.contentDetails.videoId)
              }
            })
            req.user.save();
            req.flash("info", "Videos from playlist added to collection");
            res.redirect("/dashboard")
          })
    }});

app.get("/random-video", function(req, res) {
  if (req.user) {
    const userVideos = req.user.videos
    if (userVideos.length === 0) {
      req.flash("info", "Collection is empty")
      res.redirect("/dashboard")
    } else {
      const video = userVideos[Math.floor(Math.random() * userVideos.length)];
      res.render("get-video", {
        videoId: video,
        user: req.user
      })
    }
  } else {
    res.redirect("/login")
  }
});

app.post('/change-password', function(req, res) {
  const password1 = req.body.password1;
  const password2 = req.body.password2;
  const userID = req.user._id;
  if (password1 === password2) {
    User.findById(userID, function(err, user) {
      if (!err) {
        user.setPassword(password1, function(err, user) {
          if (!err) {
            user.save();
            req.flash("info", "Password changed")
            res.redirect("/dashboard")
          }
        })
      }
    })
  } else
    req.flash("info", "Passwords don't match")
  res.redirect("/dashboard")
});


app.route("/all-videos")

  .get(function(req, res) {
    if (req.user) {
      const userID = req.user._id
      User.findById(userID, function(err, user) {
        if (!err) {
          const allVideos = user.videos;
          if (allVideos.length === 0) {
            req.flash("info", "Collection is empty")
            res.redirect("/dashboard")
          } else {
            res.render("all-videos", {
              videos: allVideos,
              user: req.user
            })
          }
        }
      })
    } else {
      res.redirect("/login");
    }
  })

app.get("/delete/:videoId", function(req, res) {
  if (!req.user) {
    res.redirect("/login")
  } else {
    const userID = req.user._id;
    User.findById(userID, function(err, user) {
      if (!err) {
        const prevVideos = user.videos;
        if (prevVideos.length === 0){
          res.redirect("/dashboard")
        } else {
        user.videos = prevVideos.filter((id) => {
          return id !== req.params.videoId;
        })
        user.save();
        req.flash("info", "Video " + req.params.videoId + " deleted")
        res.redirect('/all-videos')
      }
      }
    })
  }
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started successfully");
});
