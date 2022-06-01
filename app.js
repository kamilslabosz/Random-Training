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

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect('mongodb://localhost:27017/trainingDB');

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema ({
  name: String,
  password: String,
  videos: [],
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user){
    done(err, user);
  });
});

app.route("/")

.get(function(req, res){
  res.render("home");
});

// LOGIN AND REGISTER MANAGEMENT //////////////////////////////////////

app.route("/register")
.get(function(req, res){
  res.render("register");
})

.post(function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/");
      })
    }
  })

});

app.route("/login")
.get(function(req, res){
  res.render("login");
})

.post(function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function(err){
    if (err){
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/");
      })
    }
  })
});

app.get("/logout", function(req, res, next){
  req.logout(function(err) {
    if (err) {
       return next(err)
     }
   });
  res.redirect("/");
});

app.route("/add-video/:userId")

.get(function(req, res){
  res.render("add-video")
})

.post(function(req, res){
  const userID = req.params.userId;
  const newVideo = req.body.videoLink;
  User.findById(userID, function(err, user){
    if (!err) {
      user.videos.push(newVideo);
      res.redirect("/add-video", {
        videoAdded: true,
      })
    }
  })

});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
