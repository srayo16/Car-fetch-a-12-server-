const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dysjk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
console.log('DB Connected');

async function run() {
    try {
        await client.connect();
        const partsDatabase = client.db("PartsSupplier").collection("Parts");
        const bookingsDatabase = client.db("PartsSupplier").collection("bookings");

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

        app.post('/booking', async (req, res) => {
            const booked = req.body;
            const result = await bookingsDatabase.insertOne(booked);
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
