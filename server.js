const express = require("express");
// const ejs = require("ejs");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");

const passport = require("passport");
const session = require("express-session");
// const passportLocal = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

const mongoose = require("mongoose");
require("dotenv").config();

const Schema = mongoose.Schema;

mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true });

app.set("view engine", "ejs");
app.use(
	bodyParser.urlencoded({
		extended: true,
	})
);

app.use(methodOverride("_method"));

//authentification config
app.use(
	session({
		secret: "keyboard cat",
		resave: false,
		saveUninitialized: true,
		cookie: { secure: true },
	})
);

app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
	user = req.user;
	next();
});

// app.use((req, res, next) => {
// 	res.locals.loggedIn = req.isAuthenticated();
// 	res.locals.currentUser = req.user;
// 	next();
// });

//post schema
const PostSchema = new Schema({
	title: String,
	description: String,
	image: String,
	likes: [{ type: Schema.Types.ObjectId, ref: "Like" }],
	dislikes: [{ type: Schema.Types.ObjectId, ref: "Dislike" }],

	comments: [
		{
			type: Schema.Types.ObjectId,
			ref: "Comment",
		},
	],
});

const Post = mongoose.model("Post", PostSchema);

//user schema
const userSchema = new Schema({
	username: String,
	password: String,
});

userSchema.plugin(passportLocalMongoose);
const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser((user, done) => {
	done(null, user);
});
passport.deserializeUser((user, done) => {
	done(null, user);
});

//comment schema
const commentSchema = new Schema({
	author: String,
	comment: String,
});
const Comment = mongoose.model("Comment", commentSchema);

//like schema
const likeSchema = new Schema({
	liker: String,
});
const Like = mongoose.model("Like", likeSchema);

//dislike schema
const dislikeSchema = new Schema({
	disliker: String,
});
const Dislike = mongoose.model("Dislike", dislikeSchema);

let isLoggedIn = false;
// const isLoggedIn = (req, res, next) => {
// 	if (req.isAuthenticated()) {
// 		next();
// 	} else {
// 		res.redirect("/login");
// 	}
// };
let currentUser = "";

//home
app.get("/", (req, res) => {
	Post.find({}, (err, posts) => {
		if (err) {
			console.log(err);
		} else {
			res.render("home", {
				posts: posts,
				isLoggedIn: isLoggedIn,
				currentUser: currentUser,
			});
		}
	});
});

//show all blog posts
app.get("/blogs", (req, res) => {
	Post.find({}, (err, posts) => {
		if (err) {
			console.log(err);
		} else {
			res.render("home", {
				posts: posts,
				isLoggedIn: isLoggedIn,
				currentUser: currentUser,
			});
		}
	});
});

//create form
app.get("/blogs/new", (req, res) => {
	res.render("addPost", { currentUser: currentUser });
});

//add new post to DB
app.post("/blogs", (req, res) => {
	const newPost = new Post({
		title: req.body.title,
		description: req.body.description,
		image: req.body.image,
	});
	newPost.save((err, data) => {
		if (err) {
			console.log(err);
		} else {
			res.redirect("/");
		}
	});
});

//single blog post
app.get("/blogs/:id", (req, res) => {
	Post.findById(req.params.id)
		.populate("comments")
		.exec((err, post) => {
			if (err) {
				console.log(err);
			} else {
				res.render("post", { post: post, currentUser: currentUser });
			}
		});
});

//edit
app.get("/blogs/:id/edit", (req, res) => {
	Post.findById(req.params.id, (err, post) => {
		if (err) {
			console.log(err);
		} else {
			res.render("edit-post", { post: post, currentUser: currentUser });
		}
	});
});

app.put("/blogs/:id", (req, res) => {
	Post.findByIdAndUpdate(
		req.params.id,
		{
			title: req.body.title,
			image: req.body.image,
			description: req.body.description,
			tag: req.body.tag,
		},
		(err, update) => {
			if (err) {
				console.log(err);
			} else {
				res.redirect("/blogs/" + req.params.id);
			}
		}
	);
});

//delete post
app.delete("/blogs/:id", (req, res) => {
	Post.findByIdAndDelete(req.params.id, (err) => {
		if (err) {
			console.log(err);
		} else {
			res.redirect("/");
		}
	});
});

//authentication
app.get("/signup", (req, res) => {
	res.render("signup", { currentUser: currentUser });
});

app.post("/signup", (req, res) => {
	User.register(
		{ username: req.body.username },
		req.body.password,
		(err, user) => {
			if (err) {
				console.log(err);
			} else {
				passport.authenticate("local")(req, res, () => {
					console.log("=========user registerd");
					// console.log(user);
					res.redirect("/");
				});
			}
		}
	);
});

//login form
app.get("/login", (req, res) => {
	res.render("login", { currentUser: currentUser });
});

app.post("/login", (req, res, next) => {
	passport.authenticate("local", (err, user, info) => {
		if (err) {
			return next(err);
		}
		if (!user) {
			return res.redirect("/login");
		}
		req.logIn(user, (err) => {
			if (err) {
				return next(err);
			}
			isLoggedIn = true;
			currentUser = req.user.username;

			return res.redirect("/");
		});
	})(req, res, next);
});

//logout
app.get("/logout", (req, res) => {
	req.logout();
	isLoggedIn = false;
	currentUser = "";
	res.redirect("/");
});

//comment
app.post("/blogs/:id/comments", (req, res) => {
	const comment = new Comment({
		author: currentUser,
		comment: req.body.comment,
	});
	comment.save((err, result) => {
		if (err) {
			console.log(err);
		} else {
			Post.findById(req.params.id, (err, post) => {
				if (err) {
					console.log(err);
				} else {
					post.comments.push(result);
					post.save();
					res.redirect("/");
				}
			});
		}
	});
});

//like
app.post("/blogs/:id/like", (req, res) => {
	const like = new Like({
		liker: currentUser,
	});
	let isLiked = false;
	like.save((err, result) => {
		if (err) {
			console.log(err);
		} else {
			Post.findById(req.params.id)
				.populate("likes")
				.exec((err, post) => {
					if (err) {
						console.log(err);
					} else {
						post.likes.forEach((item) => {
							if (item.liker === result.liker) {
								post.likes.pull(item);
								isLiked = true;
							}
						});
						if (!isLiked) {
							post.likes.push(result);
						}
						post.save();
						res.redirect("/");
					}
				});
		}
	});
});

//unlike
app.post("/blogs/:id/dislike", (req, res) => {
	const dislike = new Dislike({
		disliker: currentUser,
	});
	let isDisliked = false;
	dislike.save((err, result) => {
		if (err) {
			console.log(err);
		} else {
			Post.findById(req.params.id)
				.populate("dislikes")
				.exec((err, post) => {
					if (err) {
						console.log(err);
					} else {
						post.dislikes.forEach((item) => {
							if (item.disliker === result.disliker) {
								post.dislikes.pull(item);
								isDisliked = true;
							}
						});
						if (!isDisliked) {
							post.dislikes.push(result);
						}
						post.save();
						res.redirect("/");
					}
				});
		}
	});
});

app.listen(5000, () => {
	console.log("Server is running");
});
