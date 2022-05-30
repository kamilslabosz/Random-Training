const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect('mongodb://localhost:27017/trainingDB');

const userSchema = {
  name: String,
  password: String,
  videos: [],
}

const User = mongoose.model("User", userSchema);

app.route("/")

.get(function(req, res){
  res.render("home");
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
