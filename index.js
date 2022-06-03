const express = require('express')
const http = require('http');
const fs = require('fs');
const bodyParser = require('body-parser');
const {check, validationResult} = require('express-validator')
const session = require('express-session')
const axios = require("axios");
const mongoDb = require("mongodb");

const getMoviesOptions = {
    method: 'GET',
    url: 'https://movies-app1.p.rapidapi.com/api/movies',
    headers: {
        'X-RapidAPI-Host': 'movies-app1.p.rapidapi.com',
        'X-RapidAPI-Key': 'd5ca66206emsh2d7ae4081e2cbeap1adca1jsn318e1b369063'
    }
};


/*let mongoClient = new mongoDb.MongoClient('mongodb://localhost:27017/', {
    useUnifiedTopology: true
});*/

let db
let usersCollection
let movieCollection
let wishListCollection

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://abdu:Bec57tvYC8P4t4v2@cluster0.jamloaj.mongodb.net/?retryWrites=true&w=majority";
let mongoClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
/*client.connect(err => {
    const collection = client.db("test").collection("devices");
    // perform actions on the collection object
    client.close();
});*/
mongoClient.connect(async function (error, mongo) {
    if (!error) {
        db = mongo.db('assignment');
        usersCollection = db.collection('users');
        movieCollection = db.collection('movies')
        wishListCollection = db.collection('wishlists')
    } else {
        console.log(error)
    }
});


const app = express()
const cookieParser = require('cookie-parser');
const {ObjectId, ObjectID} = require("mongodb");

app.use(cookieParser());
app.use(session({
    secret: '123',
    saveUninitialized: true,
}))

app.use(function (req, res, next) {
    res.locals.user = req.session.user;
    next();
});

app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/public'));


const urlEncodedParser = bodyParser.urlencoded({extended: false})

app.post('/register', urlEncodedParser, [
    check('username', 'This is must be 3+ characters long')
        .exists()
        .isLength({min: 3})
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(422).jsonp(errors.array())
    }


    let username = req.body.username
    console.log(username)
    res.cookie('username', username)
    res.redirect('/register');
})

app.get('/form', (req, res) => {
    res.render('form')
});

app.post('/form', urlEncodedParser, (req, res) => {
    var formName = req.body.formName
    var formCountry = req.body.formCountry
    var formEmail = req.body.formEmail
    res.render('res', {
        name: formName,
        country: formCountry,
        email: formEmail
    })
});


app.get('/register', (req, res) => {
    var val = null
    if (req.session.date)
        val = req.session.date
    else {
        req.session.date = new Date()
    }
    res.render('register', {
        title: 'Мой контакты',
        dateOfSession: val
    })
});

app.get('/session', (req, res) => {
    res.send(req.session.date)
});

app.get('/genres', (req, res) => {
    apiOptions.method = 'GET'
    apiOptions.url = 'https://unogsng.p.rapidapi.com/genres'
    axios.request(apiOptions).then(function (response) {
        res.send(response.data);
    }).catch(function (error) {
        console.error(error);
        res.status(500).json(error);
    });
});

app.get('/countries', (req, res) => {
    apiOptions.method = 'GET'
    apiOptions.url = 'https://unogsng.p.rapidapi.com/countries'
    axios.request(apiOptions).then(function (response) {
        res.send(response.data);
    }).catch(function (error) {
        console.error(error);
        res.status(500).json(error);
    });
});

app.get('/people/search-by-name', (req, res) => {
    apiOptions.method = 'GET'
    apiOptions.url = 'https://unogsng.p.rapidapi.com/people'
    apiOptions.params = {
        name: req.query.name
    }
    axios.request(apiOptions).then(function (response) {
        res.send(response.data);
    }).catch(function (error) {
        console.error(error);
        res.status(500).json(error);
    });
});

app.get('/login', (req, res) => {
    res.render('login')
})
app.get('/admin', async (req, res) => {
    if (!req.session.user || (req.session.user && req.session.user === 'ADMIN')) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let user = await usersCollection.findOne({"username": req.session.username})
        user.lastRequestTime = new Date()
        await usersCollection.findOneAndReplace({_id: user._id}, user)
        let users
        if (req.query.sortBy) {
            let sortBy = req.query.sortBy
            let mySort = sortBy === 'name' ? {name: 1} : {city: 1}
            console.log(mySort)
            users = await usersCollection.find({}).sort(mySort).toArray()
        } else {
            users = await usersCollection.find({}).toArray()
        }
        res.render('admin', {
            users: users
        })
    }
})
app.get('/', async (req, res) => {

    if (req.session.username) {
        let user = await usersCollection.findOne({"username": req.session.username})
        user.lastRequestTime = new Date()
        await usersCollection.findOneAndReplace({_id: user._id}, user)
    }
    let movies = await movieCollection.find({}).toArray()
    if (req.session.username) {
        for (const movie of movies) {
            let wishList = await wishListCollection.findOne({movieId : movie._id.toString(), userId : req.session.user._id})
            if (wishList)
                movie.isInWishList = true
            else
                movie.isInWishList = false
        }
    }
    console.log(movies)
    res.render('index', {
        movies: movies
    })
})

app.get('/signup', (req, res) => {
    res.render('signup')
})

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login')
})

app.post('/signup', urlEncodedParser, async (req, res) => {
    let username = req.body.username
    let name = req.body.name
    let password = req.body.password
    let city = req.body.city

    const passwordPattern = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{7,15}$/;
    if (!password.match(passwordPattern)) {
        res.render('signup.ejs', {
            passwordError: 'Неправильный формат пароля'
        })
    } else {
        let user = {}
        user.username = username
        user.name = name
        user.password = password
        user.city = city
        user.registrationDate = new Date()
        user.role = 'USER'

        await usersCollection.insertOne(user)

        res.render('login', {
            message: 'Successfully registered'
        })
    }
})

app.get('/update/:id', async (req, res) => {
    if (!req.session.user || (req.session.user && req.session.user === 'ADMIN')) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let id = req.params.id
        console.log(id)
        console.log(id)
        let user = await usersCollection.findOne({_id: new ObjectId(id)})
        res.render('userUpdate', {
            user: user
        })
    }
})

app.post('/users/:id', urlEncodedParser, async (req, res) => {
    if (!req.session.user || (req.session.user && req.session.user === 'ADMIN')) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let id = req.params.id

        let user = await usersCollection.findOne({_id: new ObjectId(id)})
        user.username = req.body.username
        user.name = req.body.name
        user.city = req.body.city
        await usersCollection.findOneAndReplace({_id: user._id}, user)
        res.redirect('/admin')
    }
})

app.get('/addUser', async (req, res) => {
    if (!req.session.user || (req.session.user && req.session.user === 'ADMIN')) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        res.render("addUser")
    }
})

app.post('/users-add-new', urlEncodedParser, async (req, res) => {
    if (!req.session.user || (req.session.user && req.session.user === 'ADMIN')) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let username = req.body.username
        let name = req.body.name
        let password = req.body.password
        let city = req.body.city

        const passwordPattern = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{7,15}$/;
        if (!password.match(passwordPattern)) {
            res.render('addUser.ejs', {
                passwordError: 'Неправильный формат пароля'
            })
        } else {
            let user = {}
            user.username = username
            user.name = name
            user.password = password
            user.city = city
            user.registrationDate = new Date()

            await usersCollection.insertOne(user)

            let users = await usersCollection.find({}).toArray()
            res.render('admin', {
                users: users,
                message: 'Successfully registered'
            })
        }
    }
})

app.get('/delete/:id', urlEncodedParser, async (req, res) => {
    if (!req.session.user || (req.session.user && req.session.user === 'ADMIN')) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let id = req.params.id
        await usersCollection.deleteOne({_id: new ObjectId(id)})
        res.redirect('/admin')
    }
})

app.get('/profile-view', urlEncodedParser, async (req, res) => {
    if (!req.session.user) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let user = await usersCollection.findOne({"username": req.session.username})
        res.locals.user = user;
        res.render('profile')
    }
})

app.get('/movies-add', urlEncodedParser, async (req, res) => {
    if (!req.session.user || (req.session.user && req.session.user === 'ADMIN')) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
    res.render('movie-add')
    }
})

app.post('/movies-add', urlEncodedParser, async (req, res) => {
    if (!req.session.user || (req.session.user && req.session.user === 'ADMIN')) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let movie = {}
        movie.name = req.body.name
        movie.shortDescription = req.body.shortDescription
        movie.description = req.body.description
        movie.imageUrl = req.body.imageUrl
        movie.bookImageUrl = req.body.bookImageUrl
        movie.videoUrl = req.body.videoUrl
        movie.country = req.body.country
        movie.madeYear = req.body.madeYear
        movie.category = req.body.category
        await movieCollection.insertOne(movie)
        res.redirect('/movies')
    }
})

app.get('/movies', urlEncodedParser, async (req, res) => {
    if (!req.session.user || (req.session.user && req.session.user === 'ADMIN')) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let movies = await movieCollection.find({}).toArray()
        res.render('movie-admin', {
            movies: movies
        })
    }
})

app.get('/movies/delete/:id', urlEncodedParser, async (req, res) => {
    if (!req.session.user || (req.session.user && req.session.user === 'ADMIN')) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let id = req.params.id
        await movieCollection.deleteOne({_id: new ObjectId(id)})
        res.redirect('/movies')
    }
})

app.get('/movies/update/:id', async (req, res) => {
    if (!req.session.user || (req.session.user && req.session.user === 'ADMIN')) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let id = req.params.id
        let movie = await movieCollection.findOne({_id: new ObjectId(id)})
        res.render('movie-update', {
            movie: movie
        })
    }
})

app.post('/movies/update/:id', urlEncodedParser, async (req, res) => {
    if (!req.session.user || (req.session.user && req.session.user === 'ADMIN')) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let id = req.params.id

        let movie = await movieCollection.findOne({_id: new ObjectId(id)})
        movie.name = req.body.name
        movie.shortDescription = req.body.shortDescription
        movie.description = req.body.description
        movie.imageUrl = req.body.imageUrl
        movie.bookImageUrl = req.body.bookImageUrl
        movie.videoUrl = req.body.videoUrl
        movie.country = req.body.country
        movie.madeYear = req.body.madeYear
        movie.category = req.body.category
        await movieCollection.findOneAndReplace({_id: movie._id}, movie)
        res.redirect('/movies')
    }
})

app.get('/movies/update/:id', async (req, res) => {
    if (!req.session.user || (req.session.user && req.session.user === 'ADMIN')) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let id = req.params.id
        let movie = await movieCollection.findOne({_id: new ObjectId(id)})
        res.render('movie-update', {
            movie: movie
        })
    }
})

app.get('/movies/:id', async (req, res) => {
        let id = req.params.id
        let movie = await movieCollection.findOne({_id: new ObjectId(id)})
        res.render('movie-view', {
            movie: movie
        })
})

app.get('/wish-lists', async (req, res) => {
    if (!req.session.user) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let wishLists = await wishListCollection.find({"userId": req.session.user._id}).toArray()
        let movies = []
        for (const wishList of wishLists) {
            let movie = await movieCollection.findOne({"_id": new ObjectId(wishList.movieId)})
            if (movie)
                movies.push(movie)
        }
        res.render('wish-lists', {
            movies: movies
        })
    }
})

app.get('/movies-wish-list-add/:id', async (req, res) => {
    if (!req.session.user) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let id = req.params.id
        let movie = await movieCollection.findOne({_id: new ObjectId(id)})
        let wishList = {}
        wishList.movieId = movie._id.toString()
        wishList.userId = req.session.user._id.toString()
        await wishListCollection.insertOne(wishList)
        res.redirect('/')
    }
})

app.get('/movies-wish-list-remove/:id', async (req, res) => {
    if (!req.session.user) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        let id = req.params.id
        await wishListCollection.deleteMany({"userId": req.session.user._id, "movieId": id})
        res.redirect('/wish-lists')
    }
})

app.get('/profile-edit', urlEncodedParser, async (req, res) => {
    if (!req.session.user) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        res.render('profile-edit')
    }
})


app.post('/profile-edit', urlEncodedParser, async (req, res) => {
    if (!req.session.user) {
        res.render('login', {
            message: "Needs authorization"
        })
    } else {
        console.log('user ID: ', res.locals.user._id)

        let user = await usersCollection.findOne({"username": req.session.username})
        user.name = req.body.name
        user.city = req.body.city
        user.lastRequestTime = new Date()
        console.log('USER: ' + user)
        await usersCollection.findOneAndReplace({_id: user._id}, user)
        res.locals.user = user
        res.redirect('/profile-view')
    }
})

app.post('/login', urlEncodedParser, async (req, res) => {
    let username = req.body.username
    let password = req.body.password

    let user = await usersCollection.findOne({"username": username, "password": password})
    console.log(user)
    if (!user) {
        console.log("NOT FOUND")
        res.render('login', {
            message: 'Invalid username or password'
        })
    } else {
        user.lastLoginTime = new Date()
        await usersCollection.findOneAndReplace({_id: new ObjectId(user._id)}, user)
        req.session.username = username
        req.session.user = user
        res.locals.user = user;
        res.redirect("/")
    }
})

let port = process.env.PORT;
if (port == null || port === "") {
    port = 3000;
}

async function getMoviesList() {
    let movies = []
    await axios.request(getMoviesOptions).then(function (response) {
        movies = response.data.results
    }).catch(function (error) {
        console.log(error)
    });
    return movies
}


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
