const db = require('../index');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
// const TOKEN_KEY = 1092388347;
const saltRounds = 10;
const { v4: uuid } = require('uuid');


exports.login = (req, res) => {
    console.log(req.body)
    let { email, password } = req.body;

    if (!email || !password) {
        res.status(400)
            .send({
                message: "Could not login. You must provide a 'email' and 'password'."
            });
        return;
    }

    const query = `
        SELECT * FROM urls.users 
            WHERE email = ?;
    `;

    const placeholders = [email];

    db.query(query, placeholders, async (err, results) => {
        if (err) {
            res.status(500)
                .send({
                    message: "There was an error logging in. Please try again.",
                    error: err
                });
        } else if (results.length == 0) {
            res.status(404)
                .send({
                    message: "email or Password was incorrect."
                });
        } else {
            let encryptedPassword = results[0].password;
            const passwordMatched = await bcrypt.compare(password, encryptedPassword);

            if (passwordMatched) {
                //successful login

                let user = results[0];

                //create token for the user
                const token = jwt.sign(
                    {
                        userId: user.id,
                        email: user.email
                    },
                    'abc123',
                    {
                        expiresIn: '2h'
                    }
                );
                user.token = token; // attach token to the user

                res.send({
                    message: "You have successfully logged in.",
                    user
                });
            } else {
                //failed login
                res.status(404)
                    .send({
                        message: "email or password was incorrect."
                    });
            }
        }
    });
}

exports.createNewUser = async (req, res) => {

    let { email, password } = req.body;

    if (!email || !password) {
        res.status(400)
            .send({
                message: " Could not create account. You must provide a 'email' and 'password'."
            });
        return;
    }

    const encryptedPassword = await bcrypt.hash(password, saltRounds);



    const query = `
        INSERT INTO users (id, email, password)
        VALUES
            (?, ?, ?);
    `;

    const placeholders = [uuid(), email, encryptedPassword];

    db.query(query, placeholders, (err, results) => {


        if (err) {
            if (err.errno === 1062) {
                res.status(400)
                    .send({
                        message: "That email already exists, try again with a different email",
                        error: err
                    });
            } else {
                // case #3
                res.status(500)
                    .send({
                        message: "There was an error creating your account.",
                        error: err
                    });
            }
        } else {
            // success
            this.login(req, res);
        }
    });
}

exports.deleteUserById = (req, res) => {

    let { id } = req.params;

    id = Number(id);

    const query = `
        DELETE FROM urls.users 
            WHERE (id = ?);
    `;
    const placeholders = [id];

    // tell the database to execute that script
    db.query(query, placeholders, (err, results) => {

        if (err) {
            res.status(500)
                .send({
                    message: "There was an error deleting your account.",
                    error: err
                });
        } else if (results.affectedRows === 0) {
            res.status(404)
                .send({
                    message: "That account could not be deleted"
                })
        } else {
            res.send({
                message: 'the account was deleted successfully.'
            });
        }
    });
}

