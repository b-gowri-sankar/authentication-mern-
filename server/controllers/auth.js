const User = require("../models/User");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// exports.signup = (req, res) => {
// 	console.log("req body on signup", req.body);
// 	const { name, email, password } = req.body;

// 	User.findOne({ email }).exec((err, user) => {
// 		if (user) {
// 			return res.status(400).json({
// 				error: "Email is taken",
// 			});
// 		}
// 		if (err) {
// 			console.error(err);
// 		}
// 	});

// 	let newUser = new User({ name, email, password });
// 	newUser.save((err, success) => {
// 		if (err) {
// 			console.error(err);
// 			return res.status(400).json({
// 				error: err,
// 			});
// 		}
// 		res.json({
// 			user: newUser,
// 		});
// 	});
// };

exports.signup = (req, res) => {
	//sign in with email,
	const { name, email, password } = req.body;
	User.findOne({ email }).exec((err, user) => {
		if (user) {
			return res.status(400).json({
				error: "Email is taken",
			});
		}

		const token = jwt.sign(
			{ name, email, password },
			process.env.JWT_ACCOUNT_ACTIVATION,
			{ expiresIn: "10m" }
		);

		const emailData = {
			from: process.env.EMAIL_FROM,
			to: email,
			subject: `Account activation link`,
			html: `
                <h1>Please use the following link to activate your account</h1>
                <p>${process.env.CLIENT_URL}/auth/activate/${token}</p>
                <hr />
                <p>This email may contain sensetive information</p>
                <p>${process.env.CLIENT_URL}</p>
            `,
		};
		sgMail
			.send(emailData)
			.then((sent) => {
				console.log("Sign up email sent");
				return res.json({
					message: "Email has be send to your email",
				});
			})
			.catch((err) => {
				console.log("it is executing");
				console.error(err);
			});
	});
};

exports.accountActivation = (req, res) => {
	const { token } = req.body;
	if (token) {
		jwt.verify(
			token,
			process.env.JWT_ACCOUNT_ACTIVATION,
			function (err, docoded) {
				if (err) {
					console.log("JWT verify in account activation error", err);
					return res.status(401).json({
						error: "Expire lik. Signup again",
					});
				}
				const { name, email, password } = jwt.decode(token);
				const user = new User({ name, email, password });
				user.save((err, user) => {
					if (err) {
						console.log("save user in account activation error", err);
						return res.status(401).json({
							error: "Error saving user in database",
							user: { name, email, password },
						});
					}
					return res.json({
						message: "Signup success. Please signin",
					});
				});
			}
		);
	} else {
		return res.json({
			message: "Somethig Went wrong, try again",
		});
	}
};

exports.signin = (req, res) => {
	const { email, password } = req.body;
	User.findOne({ email }).exec((err, user) => {
		if (err || !user) {
			return res.status(400).json({
				error: "User with that email does not exist",
			});
		}
		//authenticate
		if (!user.authenticate(password)) {
			return res.status(400).json({
				error: "Email and password do not match",
			});
		}
		//generate a token and send to client
		const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
			expiresIn: "7d",
		});
		const { _id, name, email, role } = user;

		return res.status(200).json({
			token,
			user: { _id, name, email, role },
		});
	});
};
