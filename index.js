const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId, ObjectID } = require('mongodb');
const stripe = require('stripe')(process.env.REVEL_TEST_API_KEY);

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dysjk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        console.log('DB Connected');
        const partsDatabase = client.db("PartsSupplier").collection("Parts");
        const bookingsDatabase = client.db("PartsSupplier").collection("bookings");
        const paymentDatabase = client.db("PartsSupplier").collection("payments");
        const reviewDatabase = client.db("PartsSupplier").collection("reviews");
        const informationDatabase = client.db("PartsSupplier").collection("userInformation");

        app.get('/parts', async (req, res) => {
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

        app.get('/booking', async (req, res) => {
            const query = {};
            const result = await bookingsDatabase.find(query).toArray();
            res.send(result);

        })

        app.post('/booking', async (req, res) => {
            const booked = req.body;
            const result = await bookingsDatabase.insertOne(booked);
            res.send(result);
        })

        app.get('/booking', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await bookingsDatabase.find(query).toArray();

            res.send(result);
        })

        app.post('/review', async (req, res) => {

            const review = req.body;
            const result = await reviewDatabase.insertOne(review);
            res.send(result)
        })

        app.get('/review', async (req, res) => {
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
