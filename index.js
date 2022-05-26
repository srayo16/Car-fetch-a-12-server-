const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId, ObjectID } = require('mongodb');
const stripe = require('stripe')(process.env.REVEL_TEST_API_KEY);

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dysjk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}


async function run() {
    try {
        await client.connect();
        console.log('DB Connected');
        const partsDatabase = client.db("PartsSupplier").collection("Parts");
        const bookingsDatabase = client.db("PartsSupplier").collection("bookings");
        const paymentDatabase = client.db("PartsSupplier").collection("payments");
        const reviewDatabase = client.db("PartsSupplier").collection("reviews");
        const informationDatabase = client.db("PartsSupplier").collection("userInformation");
        const usersDatabase = client.db("PartsSupplier").collection("users");


        app.get('/parts', verifyJWT, async (req, res) => {
            const query = {};
            const result = await partsDatabase.find(query).toArray();
            res.send(result);

        })

        app.get('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await partsDatabase.findOne(query);
            res.send(result);
        })

        app.post('/parts', async (req, res) => {
            const product = req.body;
            // const doc = {
            //     product,
            // }
            const result = await partsDatabase.insertOne(product);
            res.send(result);
        })

        app.delete('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await partsDatabase.deleteOne(query);
            res.send(result);
        })

        app.get('/booking', verifyJWT, async (req, res) => {
            const query = {};
            const result = await bookingsDatabase.find(query).toArray();
            res.send(result);

        })

        app.post('/booking', async (req, res) => {
            const booked = req.body;
            const result = await bookingsDatabase.insertOne(booked);
            res.send(result);
        })

        app.get('/book', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            // console.log(query);
            const result = await bookingsDatabase.find(query).toArray();
            res.send(result);
        })

        app.post('/review', async (req, res) => {

            const review = req.body;
            const result = await reviewDatabase.insertOne(review);
            res.send(result)
        })

        app.get('/review', verifyJWT, async (req, res) => {
            const query = {};
            const result = await reviewDatabase.find(query).toArray();
            res.send(result);
        })

        app.post('/information', async (req, res) => {
            const review = req.body;
            const result = await informationDatabase.insertOne(review);
            res.send(result)
        })

        app.get('/information', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await informationDatabase.findOne(query);
            res.send(result);

        })

        app.put('/information/:email', async (req, res) => {
            const email = req.params.email;
            const updateOne = req.body;
            const filter = { email: email };
            // console.log(email);
            const updateDoc = {
                $set: updateOne,
            };
            const result = await informationDatabase.updateOne(filter, updateDoc);
            res.send(result);

        })

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await usersDatabase.find().toArray();
            res.send(users);
        });


        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersDatabase.findOne({ email: email });
            const isAdmin = user?.role === 'admin';
            res.send({ admin: isAdmin })
        })


        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await usersDatabase.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.put('/all-booking/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: { status: 'shipped' },
            };
            const result = await bookingsDatabase.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersDatabase.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        });

        //start

        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const booking = await bookingsDatabase.findOne(query);
            res.send(booking);
        })
        app.patch('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const paymentDetails = req.body;
            // console.log(paymentDatabase);
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: paymentDetails.transactionId
                }
            };

            const result = await bookingsDatabase.updateOne(filter, updateDoc);
            const paymentSend = await paymentDatabase.insertOne(updateDoc);
            // sendPaymentConfirmationEmail(paymentDetails);

            res.send(result);


        })


        app.post("/create-payment-intent", async (req, res) => {
            const bookings = req.body;
            const amount = bookings.price;
            // console.log(amount);

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });


        //end
        app.delete('/booking', async (req, res) => {
            const id = req.query.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingsDatabase.deleteOne(query);
            res.send(result);
        })


    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);














app.get('/', (req, res) => {
    res.send('Alhamdilillah, server is running');
})
app.listen(port, () => {
    console.log('Listening to port', port);
})
